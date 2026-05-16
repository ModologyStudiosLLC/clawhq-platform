import { getSignInUrl } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';

// Specific route takes precedence over [...workos-authkit] catch-all.
// Initiates the WorkOS OAuth flow: generates PKCE verifier, sets the
// wos-auth-verifier cookie, and redirects the browser to WorkOS.
export async function GET() {
  const url = await getSignInUrl();
  redirect(url);
}
