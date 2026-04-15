/**
 * Member management API — open-source stub.
 * Requires the clawhq-enterprise overlay for full functionality.
 *   github.com/ModologyStudiosLLC/clawhq-enterprise
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UPGRADE_MSG = {
  error: "Member management requires ClawHQ Pro or Enterprise.",
  upgrade: "https://clawhqplatform.com/packs",
};

export async function GET() {
  return NextResponse.json({ members: [], tier: "free", seatLimit: 1 });
}

export async function POST() {
  return NextResponse.json(UPGRADE_MSG, { status: 402 });
}
