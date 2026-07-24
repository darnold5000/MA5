import Stripe from "stripe";

import {
  commerceStripeMetadata,
  getOfferingBySlug,
} from "@/lib/billing/catalog";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe-client";
import { isActiveOperationalClient } from "@/lib/auth/member-filters";
import type { ProfileLifecycleRow } from "@/lib/auth/client-lifecycle";
import { env } from "@/lib/env";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";
import { isMa5DeploymentConfigured, tenantOnConflict, withTenantId } from "@/lib/tenant/deployment";
import { createMa5TenantServiceClient } from "@/lib/tenant/service";

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

  if (!isMa5DeploymentConfigured()) {
    return {
      ok: false,
      status: 503,
      error: "MA5_TENANT_ID and MA5_LOCATION_ID must be set for checkout",
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

  const { supabase, ctx } = createMa5TenantServiceClient();

  const { data: clientProfile } = await supabase
    .from(MA5_TABLES.profiles)
    .select(
      "client_status, deleted_at, active, invitation_status, access_revoked_at, invitation_accepted_at",
    )
    .eq("tenant_id", ctx.tenantId)
    .eq("id", params.userId)
    .maybeSingle();

  if (!isActiveOperationalClient(clientProfile as ProfileLifecycleRow | null)) {
    return {
      ok: false,
      status: 403,
      error:
        "Checkout is only available for active clients. Contact MA5 staff if you need access restored.",
    };
  }

  let customerId = params.existingCustomerId ?? undefined;

  if (!customerId) {
    const { data } = await supabase
      .from(MA5_TABLES.profiles)
      .select("stripe_customer_id")
      .eq("tenant_id", ctx.tenantId)
      .eq("id", params.userId)
      .maybeSingle();
    customerId = (data?.stripe_customer_id as string | null) ?? undefined;
  }

  const stripeMeta = commerceStripeMetadata({
    user_id: params.userId,
    product_id: offering.id,
    product_slug: offering.slug,
  });

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: offering.currentStripePriceId, quantity: 1 }],
      customer: customerId,
      customer_email: customerId ? undefined : params.userEmail,
      client_reference_id: params.userId,
      metadata: stripeMeta,
      ...(mode === "subscription"
        ? {
            subscription_data: {
              metadata: stripeMeta,
            },
          }
        : {}),
      success_url: `${env.siteUrl}/app/profile?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.siteUrl}/app/profile?checkout=cancelled`,
    });

    if (!checkout.url) {
      return { ok: false, status: 400, error: "Checkout URL missing" };
    }

    await supabase.from(MA5_TABLES.checkoutSessions).upsert(
      withTenantId(ctx, {
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
      }),
      {
        onConflict: tenantOnConflict(ctx, "stripe_checkout_session_id"),
      },
    );

    return { ok: true, url: checkout.url, sessionId: checkout.id };
  } catch (err) {
    const message =
      err instanceof Stripe.errors.StripeError
        ? err.message
        : "Could not create Checkout session";
    return { ok: false, status: 400, error: message };
  }
}
