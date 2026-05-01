import { withAuth } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { readFile } from 'fs/promises';
import { homedir } from 'os';
import path from 'path';
import { DashboardShell } from "@/components/layout/shell";

async function isAlreadyConfigured(): Promise<boolean> {
  // Check cookie first (fastest path)
  const cookieStore = await cookies();
  if (cookieStore.get('clawhq_setup')?.value === '1') return true;

  // Check env for API key (server-side only signal available here)
  const hasApiKey = !!(
    process.env.ANTHROPIC_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.HERMES_URL
  );

  // Fall back to reading openclaw.json — if agents or MCP servers exist AND key is present, skip onboarding
  try {
    const configPath =
      process.env.OPENCLAW_CONFIG_PATH ??
      path.join(homedir(), '.openclaw', 'openclaw.json');
    const raw = await readFile(configPath, 'utf8');
    const config = JSON.parse(raw) as Record<string, unknown>;
    const agentCount = ((config as any)?.agents?.list ?? []).length;
    const mcpCount = Object.keys((config as any)?.mcp?.servers ?? {}).length;
    return (agentCount > 0 || mcpCount > 0) && hasApiKey;
  } catch {
    return false;
  }
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
