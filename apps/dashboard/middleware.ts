import { authkit, authkitProxy } from "@workos-inc/authkit-nextjs";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";

// ── Rate limiting ─────────────────────────────────────────────────────────────
// In-memory sliding window — suitable for single-instance Docker deployments.
// Two tiers:
//   sensitive  — key management, pack install, bridge task injection: 20 req/min
//   standard   — all other authenticated API routes: 200 req/min

interface RateWindow {
  count: number;
  windowStart: number;
}

const WINDOW_MS = 60_000; // 1 minute
const LIMITS: Record<"sensitive" | "standard", number> = {
  sensitive: 20,
  standard: 200,
};

// Sensitive route prefixes — lower limit to prevent enumeration/abuse.
const SENSITIVE_PREFIXES = [
  "/api/keys",
  "/api/packs/install",
  "/api/bridge",
  "/api/audit",
];

const rateBuckets = new Map<string, RateWindow>();

function rateLimit(ip: string, tier: "sensitive" | "standard"): boolean {
  const key = `${tier}:${ip}`;
  const now = Date.now();
  const bucket = rateBuckets.get(key);

  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    rateBuckets.set(key, { count: 1, windowStart: now });
    return true; // allowed
  }

  bucket.count += 1;
  if (bucket.count > LIMITS[tier]) {
    return false; // rate limited
  }
  return true;
}

// Periodically prune stale buckets to prevent unbounded Map growth.
// Runs at most once per minute in the middleware process.
let lastPrune = 0;
function pruneRateBuckets(): void {
  const now = Date.now();
  if (now - lastPrune < WINDOW_MS) return;
  lastPrune = now;
  for (const [key, bucket] of rateBuckets) {
    if (now - bucket.windowStart >= WINDOW_MS) rateBuckets.delete(key);
  }
}

function getIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

// ── Body size guard ───────────────────────────────────────────────────────────
// Reject requests with a Content-Length over 1 MB before they reach route
// handlers. Caddy enforces the same limit upstream; this is a defence-in-depth
// check for direct internal traffic (e.g. Paperclip → bridge endpoint).

const MAX_BODY_BYTES = 1_048_576; // 1 MB

function bodyTooLarge(request: NextRequest): boolean {
  const cl = request.headers.get("content-length");
  if (!cl) return false; // no header — can't tell, let the handler deal with it
  return parseInt(cl, 10) > MAX_BODY_BYTES;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

// Routes that are always public — no session required.
// /api/health is hit by Docker healthcheck.
// /api/version is polled by the update checker (bell icon) before login.
const PUBLIC_API = ["/api/health", "/api/version"];

// WorkOS is optional — if WORKOS_API_KEY isn't set the platform runs
// in open mode (single-user local deployment).
const WORKOS_ENABLED = !!process.env.WORKOS_API_KEY;

// Default cookie name used by @workos-inc/authkit-nextjs.
const SESSION_COOKIE = process.env.WORKOS_COOKIE_NAME || "wos-session";

const proxy = authkitProxy({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: ["/auth/*"],
  },
});

// ── Middleware ────────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  pruneRateBuckets();

  // Reject oversized bodies before any processing.
  if (bodyTooLarge(request)) {
    return NextResponse.json({ error: "Payload Too Large" }, { status: 413 });
  }

  // Auth callback routes must always be reachable.
  if (pathname.startsWith("/auth/")) return NextResponse.next();

  // Public API paths — rate limit but no auth check.
  if (PUBLIC_API.some((p) => pathname.startsWith(p))) {
    const ip = getIp(request);
    if (!rateLimit(ip, "standard")) {
      return NextResponse.json(
        { error: "Too Many Requests" },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }
    return NextResponse.next();
  }

  // Rate limit all API routes before auth check.
  if (pathname.startsWith("/api/")) {
    const ip = getIp(request);
    const tier = SENSITIVE_PREFIXES.some((p) => pathname.startsWith(p))
      ? "sensitive"
      : "standard";

    if (!rateLimit(ip, tier)) {
      return NextResponse.json(
        { error: "Too Many Requests" },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }
  }

  // If WorkOS isn't configured, allow everything (open/dev mode).
  if (!WORKOS_ENABLED) return NextResponse.next();

  // ── API routes ─────────────────────────────────────────────────────────────
  // Return JSON 401 instead of redirecting browsers to the sign-in page.
  if (pathname.startsWith("/api/")) {
    // Fast path: no session cookie → definitely unauthenticated.
    if (!request.cookies.has(SESSION_COOKIE)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Cookie present — run authkit to validate & refresh the session.
    // authkit() does not redirect; it just processes the session headers.
    const response = await authkit(request);

    // authkit clears the cookie when the session is invalid/expired.
    // If the cookie is gone in the response, the session was rejected.
    const clearedCookie = response.headers
      .getSetCookie?.()
      ?.some((c) => c.startsWith(`${SESSION_COOKIE}=;`));

    if (clearedCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return response;
  }

  // ── Page routes ────────────────────────────────────────────────────────────
  // authkitProxy handles session refresh and redirects unauthenticated users
  // to the WorkOS hosted sign-in page.
  return proxy(request, event);
}

export const config = {
  matcher: [
    // Match all routes except Next.js internals and static files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
