import Stripe from "stripe";

import { getOfferingBySlug } from "@/lib/billing/catalog";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe-client";
import { env } from "@/lib/env";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

export type CreateCheckoutResult =
  | { ok: true; url: string; sessionId: string }
  | { ok: false; status: number; error: string };

export async function createOfferingCheckout(params: {
  productSlug: string;
  userId: string;
  userEmail: string;
  existingCustomerId?: string | null;
}): Promise<CreateCheckoutResult> {
  if (!isStripeConfigured()) {
    return {
      ok: false,
      status: 503,
      error: "Stripe is not configured. Add STRIPE_SECRET_KEY to enable Checkout.",
    };
  }

  const stripe = getStripe();
  if (!stripe) {
    return { ok: false, status: 503, error: "Stripe unavailable" };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      status: 503,
      error: "Supabase is required for catalog checkout.",
    };
  }

  const offering = await getOfferingBySlug(params.productSlug, {
    activeOnly: true,
    useServiceRole: true,
  });

  if (!offering) {
    return { ok: false, status: 404, error: "Product not found" };
  }

  if (!offering.currentStripePriceId) {
    return {
      ok: false,
      status: 400,
      error: `Offering "${offering.slug}" is missing a Stripe Price. Sync it from Admin → Offerings.`,
    };
  }

  const mode: Stripe.Checkout.SessionCreateParams.Mode =
    offering.paymentType === "subscription" ? "subscription" : "payment";

  let customerId = params.existingCustomerId ?? undefined;

  if (!customerId) {
    try {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from(MA5_TABLES.profiles)
        .select("stripe_customer_id")
        .eq("id", params.userId)
        .maybeSingle();
      customerId = (data?.stripe_customer_id as string | null) ?? undefined;
    } catch {
      // continue without existing customer
    }
  }

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: offering.currentStripePriceId, quantity: 1 }],
      customer: customerId,
      customer_email: customerId ? undefined : params.userEmail,
      client_reference_id: params.userId,
      metadata: {
        user_id: params.userId,
        product_id: offering.id,
        product_slug: offering.slug,
      },
      ...(mode === "subscription"
        ? {
            subscription_data: {
              metadata: {
                user_id: params.userId,
                product_id: offering.id,
                product_slug: offering.slug,
              },
            },
          }
        : {}),
      success_url: `${env.siteUrl}/app/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.siteUrl}/app/billing?checkout=cancelled`,
    });

    if (!checkout.url) {
      return { ok: false, status: 400, error: "Checkout URL missing" };
    }

    try {
      const supabase = createServiceClient();
      await supabase.from(MA5_TABLES.checkoutSessions).upsert(
        {
          stripe_checkout_session_id: checkout.id,
          user_id: params.userId,
          product_id: offering.id,
          mode,
          status: "open",
          amount_total_cents: offering.priceCents,
          currency: offering.currency,
          stripe_customer_id: customerId ?? null,
          metadata: {
            product_slug: offering.slug,
          },
        },
        { onConflict: "stripe_checkout_session_id" },
      );
    } catch {
      // Webhook will still create/update the ledger row
    }

    return { ok: true, url: checkout.url, sessionId: checkout.id };
  } catch (err) {
    const message =
      err instanceof Stripe.errors.StripeError
        ? err.message
        : "Could not create Checkout session";
    return { ok: false, status: 400, error: message };
  }
}
