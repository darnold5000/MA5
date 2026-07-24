import type Stripe from "stripe";

import { syncOfferingCheckoutSession } from "@/lib/billing/webhooks";
import {
  subscriptionPeriodEnd,
  subscriptionPeriodStart,
} from "@/lib/billing/stripe-subscription-periods";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe-client";
import { MA5_TABLES } from "@/lib/supabase/tables";
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
  await repairSubscriptionPeriodsFromStripe(client, session, stripe);
  return { ok: true };
}

async function repairSubscriptionPeriodsFromStripe(
  client: ReturnType<typeof createMa5TenantServiceClient>,
  session: Stripe.Checkout.Session,
  stripe: Stripe,
) {
  if (session.mode !== "subscription") return;
  const subId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;
  if (!subId) return;

  const sub = await stripe.subscriptions.retrieve(subId);
  const periodEnd = subscriptionPeriodEnd(sub);
  const periodStart = subscriptionPeriodStart(sub);
  if (!periodEnd && !periodStart) return;

  const { supabase, ctx } = client;
  await supabase
    .from(MA5_TABLES.subscriptions)
    .update({
      current_period_start: periodStart,
      current_period_end: periodEnd,
    })
    .eq("tenant_id", ctx.tenantId)
    .eq("stripe_subscription_id", subId);

  await supabase
    .from(MA5_TABLES.memberships)
    .update({ current_period_end: periodEnd })
    .eq("tenant_id", ctx.tenantId)
    .eq("stripe_subscription_id", subId);
}
