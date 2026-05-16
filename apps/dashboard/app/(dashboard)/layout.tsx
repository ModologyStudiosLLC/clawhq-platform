import { withAuth } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { DashboardShell } from "@/components/layout/shell";

async function isAlreadyConfigured(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('clawhq_setup')?.value === '1';
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = await withAuth();

  if (!user) {
    redirect('/sign-in');
  }

  // Onboarding gate — skip if cookie set OR openclaw is already configured
  if (!(await isAlreadyConfigured())) {
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
