import { authkit, authkitProxy } from "@workos-inc/authkit-nextjs";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";

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

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  // Auth callback routes must always be reachable.
  if (pathname.startsWith("/auth/")) return NextResponse.next();

  // Public API paths — pass through without auth check.
  if (PUBLIC_API.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
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
