import { NextRequest, NextResponse } from "next/server";
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { provisionTenant, deprovisionTenant } from "@/lib/provisioning";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

// Stripe requires the raw body for signature verification.
export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const rawBody = await req.arrayBuffer();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      Buffer.from(rawBody),
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.clawhq_org_id;
        if (!orgId) break;

        const seats = sub.items.data[0]?.quantity ?? 1;
        const status = sub.status;

        if (status === "active" || status === "trialing") {
          await provisionTenant({
            orgId,
            stripeCustomerId: String(sub.customer),
            seats,
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.clawhq_org_id;
        if (orgId) await deprovisionTenant(orgId);
        break;
      }

      case "invoice.payment_failed": {
        // Grace period — log but don't deprovision immediately
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | { id: string } | null };
        const rawSub = invoice.subscription;
        const subId = typeof rawSub === "string" ? rawSub : rawSub && typeof rawSub === "object" ? rawSub.id : null;
        console.warn(`Payment failed for subscription ${subId} — grace period active`);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
