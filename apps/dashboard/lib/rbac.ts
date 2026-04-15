/**
 * ClawHQ RBAC — open-source stub.
 *
 * Single-user mode: the authenticated user is always treated as admin.
 * Multi-user RBAC with role enforcement is provided by the clawhq-enterprise overlay.
 *   github.com/ModologyStudiosLLC/clawhq-enterprise
 */

import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";

export type Role = "admin" | "member" | "viewer";

/** In OSS mode, every authenticated user is admin. */
export async function requireRole(_required: Role): Promise<{ email: string; role: Role }> {
  const { user } = await withAuth();
  if (!user) redirect("/sign-in");
  return { email: user.email, role: "admin" };
}

export async function checkRole(_required: Role): Promise<boolean> {
  return true;
}
