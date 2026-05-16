import { authkit, authkitProxy } from "@workos-inc/authkit-nextjs";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";

interface RateWindow { count: number; windowStart: number; }
const WINDOW_MS = 60_000;
const LIMITS: Record<"sensitive" | "standard", number> = { sensitive: 20, standard: 200 };
const SENSITIVE_PREFIXES = ["/api/keys", "/api/packs/install", "/api/bridge", "/api/audit"];
const rateBuckets = new Map<string, RateWindow>();

function rateLimit(ip: string, tier: "sensitive" | "standard"): boolean {
  const key = `${tier}:${ip}`;
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    rateBuckets.set(key, { count: 1, windowStart: now });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= LIMITS[tier];
}

let lastPrune = 0;
function pruneRateBuckets(): void {
  const now = Date.now();
  if (now - lastPrune < WINDOW_MS) return;
  lastPrune = now;
  for (const [key, bucket] of rateBuckets) {
    if (now - bucket.windowStart >= WINDOW_MS) rateBuckets.delete(key);
  }
}

function getIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? req.headers.get("x-real-ip") ?? "unknown";
}

const MAX_BODY_BYTES = 1_048_576;
function bodyTooLarge(req: NextRequest): boolean {
  const cl = req.headers.get("content-length");
  return cl ? parseInt(cl, 10) > MAX_BODY_BYTES : false;
}

const PUBLIC_API = ["/api/health", "/api/version"];
const WORKOS_ENABLED = !!process.env.WORKOS_API_KEY;
const SESSION_COOKIE = process.env.WORKOS_COOKIE_NAME || "wos-session";

// "/auth/" paths are already bypassed above before authProxy runs, so no
// unauthenticatedPaths needed here. The empty array avoids path-to-regexp v8
// parse errors from the previous "/auth/*" glob syntax.
const authProxy = authkitProxy({ middlewareAuth: { enabled: true, unauthenticatedPaths: ["/sign-in"] } });

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;
  pruneRateBuckets();

  if (bodyTooLarge(request)) return NextResponse.json({ error: "Payload Too Large" }, { status: 413 });
  if (pathname.startsWith("/auth/")) return NextResponse.next();

  if (PUBLIC_API.some((p) => pathname.startsWith(p))) {
    if (!rateLimit(getIp(request), "standard"))
      return NextResponse.json({ error: "Too Many Requests" }, { status: 429, headers: { "Retry-After": "60" } });
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    const tier = SENSITIVE_PREFIXES.some((p) => pathname.startsWith(p)) ? "sensitive" : "standard";
    if (!rateLimit(getIp(request), tier))
      return NextResponse.json({ error: "Too Many Requests" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  if (!WORKOS_ENABLED) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    if (!request.cookies.has(SESSION_COOKIE)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const authResult = await authkit(request);
    // authkit() returns session metadata, not a Response — check if session was cleared
    const sessionValid = authResult.session?.user != null;
    if (!sessionValid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const res = NextResponse.next();
    // Forward any updated session headers (e.g. refreshed cookie)
    authResult.headers.forEach((value, key) => res.headers.set(key, value));
    return res;
  }

  return (await authProxy(request, event)) ?? NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
