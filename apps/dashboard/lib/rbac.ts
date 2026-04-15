/**
 * Role-based access control helpers for ClawHQ.
 *
 * Roles are stored per-member in the local members store.
 * On enterprise plans, roles can be synced from WorkOS Directory.
 *
 * Usage (server component / route handler):
 *   import { requireRole } from "@/lib/rbac";
 *   await requireRole("admin");  // throws 403 if user isn't an admin
 */

import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import { getMember } from "./members-store";

export type Role = "admin" | "member" | "viewer";

const ROLE_ORDER: Record<Role, number> = { viewer: 0, member: 1, admin: 2 };

/**
 * Asserts the current user has at least the required role.
 * Redirects to / if not authenticated. Returns 403 JSON if unauthorized.
 * Safe to call from Server Components and Route Handlers.
 */
export async function requireRole(required: Role): Promise<{ email: string; role: Role }> {
  const { user } = await withAuth();
  if (!user) redirect("/sign-in");

  const member = await getMember(user.email);

  // The first user to set up ClawHQ is always treated as admin (no members store yet)
  const role: Role = member?.role ?? "admin";

  if (ROLE_ORDER[role] < ROLE_ORDER[required]) {
    // In route handlers, throw; in server components, redirect
    throw new Response(
      JSON.stringify({ error: "Insufficient permissions", required, current: role }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  return { email: user.email, role };
}

/** Check without throwing — useful for conditional UI. */
export async function checkRole(required: Role): Promise<boolean> {
  try {
    await requireRole(required);
    return true;
  } catch {
    return false;
  }
}
