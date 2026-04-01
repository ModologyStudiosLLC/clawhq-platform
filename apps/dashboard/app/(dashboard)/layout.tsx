import { getSession } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { DashboardShell } from "@/components/layout/shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // getSession reads the session cookie directly without requiring middleware headers.
  const session = await getSession();
  const user = session?.user;

  if (!user) {
    redirect('/sign-in');
  }

  // Onboarding gate — if user hasn't completed setup, send them there.
  const cookieStore = await cookies();
  const isSetup = cookieStore.get('clawhq_setup')?.value === '1';
  if (!isSetup) {
    redirect('/onboarding');
  }

  const displayName =
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.firstName ?? user.email;

  const initials =
    user.firstName && user.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`
      : (user.firstName?.[0] ?? user.email[0]).toUpperCase();

  return (
    <DashboardShell
      user={{
        name: displayName,
        email: user.email,
        initials,
        avatar: user.profilePictureUrl ?? undefined,
      }}
    >
      {children}
    </DashboardShell>
  );
}
