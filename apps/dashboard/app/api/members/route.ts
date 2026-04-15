import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import {
  listMembers,
  inviteMember,
  updateMemberRole,
  revokeMember,
  type Role,
} from "@/lib/members-store";
import { getLicenseTier, FEATURES } from "@/lib/license";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user } = await withAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const members = await listMembers();
  const tier = getLicenseTier();
  return NextResponse.json({
    members,
    tier,
    seatLimit: FEATURES.memberSeatLimit(tier),
  });
}

export async function POST(req: NextRequest) {
  const { user } = await withAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tier = getLicenseTier();
  if (!FEATURES.memberManagement(tier)) {
    return NextResponse.json(
      { error: "Member management requires Pro or Enterprise plan." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { action, email, role, name } = body as {
    action: string;
    email?: string;
    role?: Role;
    name?: string;
  };

  if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });

  try {
    if (action === "invite") {
      const validRole: Role = role && ["admin", "member", "viewer"].includes(role) ? role : "member";
      const current = await listMembers();
      const seatLimit = FEATURES.memberSeatLimit(tier);
      const active = current.filter(m => m.status !== "revoked").length;
      if (active >= seatLimit) {
        return NextResponse.json(
          { error: `Seat limit reached (${seatLimit} members on ${tier} plan). Upgrade to add more.` },
          { status: 403 }
        );
      }
      const member = await inviteMember(email, validRole, name);
      return NextResponse.json({ member });
    }

    if (action === "update-role") {
      const validRole: Role = role && ["admin", "member", "viewer"].includes(role) ? role : "member";
      const member = await updateMemberRole(email, validRole);
      return NextResponse.json({ member });
    }

    if (action === "revoke") {
      await revokeMember(email);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
