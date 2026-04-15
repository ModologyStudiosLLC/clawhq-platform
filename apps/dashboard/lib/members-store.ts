/**
 * ClawHQ members store — open-source stub.
 *
 * Returns an empty store in single-user mode.
 * Full member management (invite, roles, revoke) is provided by the clawhq-enterprise overlay.
 *   github.com/ModologyStudiosLLC/clawhq-enterprise
 */

export type Role = "admin" | "member" | "viewer";
export type MemberStatus = "active" | "pending" | "revoked";

export interface Member {
  email: string;
  role: Role;
  name: string | null;
  invitedAt: string;
  status: MemberStatus;
}

export async function listMembers(): Promise<Member[]> {
  return [];
}

export async function getMember(_email: string): Promise<Member | null> {
  return null;
}

export async function inviteMember(
  _email: string,
  _role: Role,
  _name?: string
): Promise<Member> {
  throw new Error("Member management requires the ClawHQ Enterprise overlay.");
}

export async function updateMemberRole(_email: string, _role: Role): Promise<Member> {
  throw new Error("Member management requires the ClawHQ Enterprise overlay.");
}

export async function revokeMember(_email: string): Promise<void> {
  throw new Error("Member management requires the ClawHQ Enterprise overlay.");
}

export async function activateMember(_email: string): Promise<void> {
  // no-op in OSS mode
}
