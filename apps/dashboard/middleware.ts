import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Don't redirect API routes, static files, or onboarding itself
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/onboarding") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Check for setup cookie — set during onboarding completion
  const isSetup = req.cookies.get("clawhq_setup")?.value === "1";

  if (!isSetup) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
