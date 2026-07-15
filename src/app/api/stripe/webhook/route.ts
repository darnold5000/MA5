import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getStripe, isStripeConfigured } from "@/lib/stripe";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

function customerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
) {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

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

  const supabase = createServiceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id ?? session.client_reference_id;
      const productSlug = session.metadata?.product_slug;
      const cust = customerId(session.customer);

      if (userId && cust) {
        await supabase
          .from(MA5_TABLES.profiles)
          .update({ stripe_customer_id: cust })
          .eq("id", userId);
      }

      if (userId && productSlug && session.mode === "subscription") {
        const { data: product } = await supabase
          .from(MA5_TABLES.products)
          .select("id")
          .eq("slug", productSlug)
          .maybeSingle();

        if (product?.id) {
          await supabase.from(MA5_TABLES.memberships).upsert(
            {
              user_id: userId,
              product_id: product.id,
              status: "active",
              stripe_subscription_id:
                typeof session.subscription === "string"
                  ? session.subscription
                  : session.subscription?.id ?? null,
              stripe_price_id:
                typeof session.line_items === "undefined" ? null : null,
            },
            { onConflict: "stripe_subscription_id" },
          );
        }
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const status =
        event.type === "customer.subscription.deleted"
          ? "canceled"
          : sub.status === "active" || sub.status === "trialing"
            ? sub.status
            : sub.status === "past_due"
              ? "past_due"
              : "inactive";

      await supabase
        .from(MA5_TABLES.memberships)
        .update({
          status,
          current_period_end: new Date(
            (sub as Stripe.Subscription & { current_period_end?: number })
              .current_period_end
              ? ((sub as Stripe.Subscription & { current_period_end: number })
                  .current_period_end * 1000)
              : Date.now(),
          ).toISOString(),
        })
        .eq("stripe_subscription_id", sub.id);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
