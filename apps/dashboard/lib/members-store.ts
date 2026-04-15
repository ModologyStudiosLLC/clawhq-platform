/**
 * Local members store — reads/writes ~/.openclaw/members.json
 *
 * Schema:
 * [
 *   { "email": "admin@example.com", "role": "admin", "name": "Alice", "invitedAt": "ISO", "status": "active" },
 *   { "email": "viewer@example.com", "role": "viewer", "name": null, "invitedAt": "ISO", "status": "pending" }
 * ]
 *
 * For enterprise + WorkOS Directory, members are also sourced from the directory.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { homedir } from "os";

export type Role = "admin" | "member" | "viewer";
export type MemberStatus = "active" | "pending" | "revoked";

export interface Member {
  email: string;
  role: Role;
  name: string | null;
  invitedAt: string;
  status: MemberStatus;
}

const MEMBERS_PATH =
  process.env.OPENCLAW_MEMBERS_PATH ??
  path.join(homedir(), ".openclaw", "members.json");

async function readStore(): Promise<Member[]> {
  try {
    const raw = await readFile(MEMBERS_PATH, "utf8");
    return JSON.parse(raw) as Member[];
  } catch {
    return [];
  }
}

async function writeStore(members: Member[]): Promise<void> {
  await mkdir(path.dirname(MEMBERS_PATH), { recursive: true });
  await writeFile(MEMBERS_PATH, JSON.stringify(members, null, 2), "utf8");
}

export async function listMembers(): Promise<Member[]> {
  return readStore();
}

export async function getMember(email: string): Promise<Member | null> {
  const members = await readStore();
  return members.find(m => m.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function inviteMember(
  email: string,
  role: Role,
  name?: string
): Promise<Member> {
  const members = await readStore();
  const existing = members.find(m => m.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    if (existing.status === "revoked") {
      existing.status = "pending";
      existing.role = role;
      existing.invitedAt = new Date().toISOString();
      await writeStore(members);
      return existing;
    }
    throw new Error(`${email} is already a member`);
  }
  const member: Member = {
    email,
    role,
    name: name ?? null,
    invitedAt: new Date().toISOString(),
    status: "pending",
  };
  members.push(member);
  await writeStore(members);
  return member;
}

export async function updateMemberRole(email: string, role: Role): Promise<Member> {
  const members = await readStore();
  const m = members.find(m => m.email.toLowerCase() === email.toLowerCase());
  if (!m) throw new Error(`Member not found: ${email}`);
  m.role = role;
  await writeStore(members);
  return m;
}

export async function revokeMember(email: string): Promise<void> {
  const members = await readStore();
  const m = members.find(m => m.email.toLowerCase() === email.toLowerCase());
  if (!m) throw new Error(`Member not found: ${email}`);
  m.status = "revoked";
  await writeStore(members);
}

export async function activateMember(email: string): Promise<void> {
  const members = await readStore();
  const m = members.find(m => m.email.toLowerCase() === email.toLowerCase());
  if (m) {
    m.status = "active";
    await writeStore(members);
  }
}
