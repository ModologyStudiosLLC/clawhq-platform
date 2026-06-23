import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { stripe } from "@/lib/stripe";
import { getTenantRecord } from "@/lib/provisioning";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { organizationId } = await withAuth({ ensureSignedIn: true });

  if (!organizationId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  if (!stripe) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const record = await getTenantRecord(organizationId);
  if (!record?.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account found" }, { status: 404 });
  }

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://clawhqplatform.com";

  const session = await stripe.billingPortal.sessions.create({
    customer: record.stripeCustomerId,
    return_url: `${APP_URL}/settings/billing`,
  });

  return NextResponse.json({ url: session.url });
}
