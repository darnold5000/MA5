import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { claimStripeWebhookEvent } from "@/lib/billing/webhook-dedup";
import { handleStripeWebhookEvent } from "@/lib/billing/webhooks";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { isMa5DeploymentConfigured } from "@/lib/tenant/deployment";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe unavailable" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing webhook signature configuration" },
      { status: 400 },
    );
  }

  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ received: true, synced: false });
  }

  if (!isMa5DeploymentConfigured()) {
    return NextResponse.json(
      {
        error:
          "MA5_TENANT_ID, MA5_LOCATION_ID, and STRIPE_ACCOUNT_ID must be set for webhooks",
      },
      { status: 503 },
    );
  }

  try {
    const claim = await claimStripeWebhookEvent(event, body);
    if (claim.status === "duplicate") {
      return NextResponse.json({ received: true, synced: true, duplicate: true });
    }

    await handleStripeWebhookEvent(event, claim.client);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook handler failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true, synced: true });
}
