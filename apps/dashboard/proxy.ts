import { authkitMiddleware } from '@workos-inc/authkit-nextjs';

// WorkOS AuthKit middleware — protects all dashboard routes.
// Unauthenticated users are redirected to the WorkOS hosted sign-in UI.
// The onboarding-setup cookie check is handled in the dashboard layout.
export default authkitMiddleware({
  middlewareAuth: {
    enabled: true,
    // Paths that do NOT require authentication
    unauthenticatedPaths: ['/sign-in', '/auth/:path*', '/api/health'],
  },
});

export const config = {
  matcher: [
    // Match everything except Next.js internals and static assets
    '/((?!_next/static|_next/image|favicon\\.ico).*)',
  ],
};
