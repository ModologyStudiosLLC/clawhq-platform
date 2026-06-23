import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { stripe, STRIPE_PRICE_ID } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { user, organizationId } = await withAuth({ ensureSignedIn: true });

  const body = await req.json().catch(() => ({}));
  const seats: number = Math.max(1, Math.min(Number(body.seats) || 1, 1000));

  if (!stripe || !STRIPE_PRICE_ID) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://clawhqplatform.com";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: STRIPE_PRICE_ID, quantity: seats }],
    subscription_data: {
      trial_period_days: 7,
      metadata: {
        clawhq_org_id: organizationId ?? "",
        clawhq_user_id: user.id,
        clawhq_seats: String(seats),
      },
    },
    customer_email: user.email,
    metadata: {
      clawhq_org_id: organizationId ?? "",
      clawhq_user_id: user.id,
    },
    success_url: `${APP_URL}/dashboard?billing=success`,
    cancel_url: `${APP_URL}/onboarding?billing=cancelled`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
