import { handleAuth } from '@workos-inc/authkit-nextjs';

// Catch-all handler for WorkOS AuthKit routes:
//   GET /auth/sign-in   → redirects to WorkOS hosted UI
//   GET /auth/callback  → exchanges code for session cookie, redirects to /home
//   GET /auth/sign-out  → clears session, redirects to /sign-in
export const GET = handleAuth();
