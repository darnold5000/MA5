import type Stripe from "stripe";

import { syncOfferingCheckoutSession } from "@/lib/billing/webhooks";
import { persistSubscriptionPeriodsForStripeId } from "@/lib/billing/ensure-subscription-periods";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe-client";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { isMa5DeploymentConfigured } from "@/lib/tenant/deployment";
import { createMa5TenantServiceClient } from "@/lib/tenant/service";

export type SyncOfferingCheckoutResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * After Stripe Checkout success — writes ma5_checkout_sessions, memberships,
 * subscriptions, and payments when webhooks have not run yet.
 */
export async function syncOfferingCheckoutSessionById(
  checkoutSessionId: string,
  expectedUserId: string,
): Promise<SyncOfferingCheckoutResult> {
  if (!isStripeConfigured()) {
    return { ok: false, error: "Stripe is not configured" };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured" };
  }
  if (!isMa5DeploymentConfigured()) {
    return {
      ok: false,
      error: "MA5_TENANT_ID and MA5_LOCATION_ID must be set",
    };
  }

  const stripe = getStripe();
  if (!stripe) {
    return { ok: false, error: "Stripe unavailable" };
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
      expand: ["line_items.data.price", "subscription"],
    });
  } catch {
    return { ok: false, error: "Could not load Checkout session from Stripe" };
  }

  if (session.status !== "complete") {
    return {
      ok: false,
      error: `Checkout session is not complete (status: ${session.status ?? "unknown"})`,
    };
  }

  const ownerId =
    session.metadata?.user_id ??
    session.client_reference_id ??
    null;
  if (!ownerId || ownerId !== expectedUserId) {
    return {
      ok: false,
      error: "This checkout does not belong to the signed-in account",
    };
  }

  const client = createMa5TenantServiceClient();
  await syncOfferingCheckoutSession(client, session);
  await repairSubscriptionPeriodsFromStripe(client, session);
  return { ok: true };
}

async function repairSubscriptionPeriodsFromStripe(
  client: ReturnType<typeof createMa5TenantServiceClient>,
  session: Stripe.Checkout.Session,
) {
  if (session.mode !== "subscription") return;
  const subId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;
  if (!subId) return;

  const { supabase, ctx } = client;
  await persistSubscriptionPeriodsForStripeId({
    supabase,
    tenantId: ctx.tenantId,
    stripeSubscriptionId: subId,
    periods: undefined,
  });
}
