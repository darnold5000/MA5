import {
  subscriptionPeriodEnd,
  subscriptionPeriodStart,
} from "@/lib/billing/stripe-subscription-periods";
import { getStripe } from "@/lib/stripe";
import { MA5_TABLES } from "@/lib/supabase/tables";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SubscriptionPeriods = {
  periodEnd: string | null;
  periodStart: string | null;
};

export async function fetchSubscriptionPeriodsFromStripe(
  stripeSubscriptionId: string,
): Promise<SubscriptionPeriods> {
  const stripe = getStripe();
  if (!stripe) return { periodEnd: null, periodStart: null };

  const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  return {
    periodEnd: subscriptionPeriodEnd(sub),
    periodStart: subscriptionPeriodStart(sub),
  };
}

/** Load period dates from Stripe and write them to ma5_subscriptions / ma5_memberships. */
export async function persistSubscriptionPeriodsForStripeId(params: {
  supabase: SupabaseClient;
  tenantId: string | null;
  stripeSubscriptionId: string;
  periods?: SubscriptionPeriods;
}): Promise<SubscriptionPeriods> {
  const periods =
    params.periods ??
    (await fetchSubscriptionPeriodsFromStripe(params.stripeSubscriptionId));

  const { periodEnd, periodStart } = periods;
  if (!periodEnd && !periodStart) return periods;

  let subUpdate = params.supabase
    .from(MA5_TABLES.subscriptions)
    .update({
      current_period_start: periodStart,
      current_period_end: periodEnd,
    })
    .eq("stripe_subscription_id", params.stripeSubscriptionId);

  let membershipUpdate = params.supabase
    .from(MA5_TABLES.memberships)
    .update({ current_period_end: periodEnd })
    .eq("stripe_subscription_id", params.stripeSubscriptionId);

  if (params.tenantId) {
    subUpdate = subUpdate.eq("tenant_id", params.tenantId);
    membershipUpdate = membershipUpdate.eq("tenant_id", params.tenantId);
  }

  await subUpdate;
  if (periodEnd) {
    await membershipUpdate;
  }

  return periods;
}
