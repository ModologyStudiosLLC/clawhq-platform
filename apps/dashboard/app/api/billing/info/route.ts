import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getTenantRecord } from "@/lib/provisioning";
import { getLicenseTier } from "@/lib/license";

export const dynamic = "force-dynamic";

export async function GET() {
  const { organizationId } = await withAuth({ ensureSignedIn: true });

  const tier = getLicenseTier();
  const record = organizationId ? await getTenantRecord(organizationId).catch(() => null) : null;

  return NextResponse.json({
    tier,
    seats: record?.seats ?? 1,
    provisionedAt: record?.provisionedAt ?? null,
    stripeCustomerId: record?.stripeCustomerId ?? null,
  });
}
