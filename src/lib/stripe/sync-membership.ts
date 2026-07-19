import {
  getOfferingBySlug,
  getOfferingByStripePriceId,
} from "@/lib/billing/catalog";
import { getStripe } from "@/lib/stripe";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

export type ActiveMembership = {
  productSlug: string;
  productName: string;
  status: string;
  currentPeriodEnd: string | null;
};

/**
 * Membership state is owned by verified Stripe webhooks.
 * This helper only reads current membership for UI — it does not mutate from redirects.
 */
export async function syncMembershipFromCheckoutSession(
  _sessionId: string,
  userId: string,
): Promise<ActiveMembership | null> {
  return getActiveMembershipForUser(userId);
}

export async function getActiveMembershipForUser(
  userId: string,
): Promise<ActiveMembership | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const fromStripe = await hydrateMembershipFromStripeCustomer(userId);
    if (fromStripe) return fromStripe;

    const supabase = createServiceClient();
    const { data } = await supabase
      .from(MA5_TABLES.memberships)
      .select("status, current_period_end, ma5_products(name, slug)")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return null;

    const product = data.ma5_products as
      | { name?: string; slug?: string }
      | { name?: string; slug?: string }[]
      | null;
    const prod = Array.isArray(product) ? product[0] : product;

    return {
      productSlug: prod?.slug ?? "",
      productName: prod?.name ?? "Membership",
      status: data.status as string,
      currentPeriodEnd: (data.current_period_end as string) ?? null,
    };
  } catch {
    return null;
  }
}

async function hydrateMembershipFromStripeCustomer(
  userId: string,
): Promise<ActiveMembership | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from(MA5_TABLES.profiles)
    .select("stripe_customer_id, email")
    .eq("id", userId)
    .maybeSingle();

  let customerId = profile?.stripe_customer_id as string | null | undefined;

  if (!customerId && profile?.email) {
    const customers = await stripe.customers.list({
      email: profile.email as string,
      limit: 1,
    });
    customerId = customers.data[0]?.id;
    if (customerId) {
      await supabase
        .from(MA5_TABLES.profiles)
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
    }
  }

  if (!customerId) return null;

  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });

  const active = subs.data.find(
    (s) =>
      (s.status === "active" || s.status === "trialing") &&
      !s.canceled_at &&
      !s.cancel_at_period_end,
  );
  if (!active) {
    const ending = subs.data.find(
      (s) =>
        s.status === "active" ||
        s.status === "trialing" ||
        s.status === "canceled",
    );
    if (ending?.id) {
      await supabase
        .from(MA5_TABLES.memberships)
        .update({ status: "canceled" })
        .eq("stripe_subscription_id", ending.id);
    }
    return null;
  }

  const priceId = active.items.data[0]?.price?.id;
  const offering = priceId
    ? await getOfferingByStripePriceId(priceId)
    : null;

  if (!offering) {
    const slug = active.metadata?.product_slug;
    if (slug) {
      const bySlug = await getOfferingBySlug(slug, { useServiceRole: true });
      if (bySlug) {
        return finalizeHydratedMembership({
          userId,
          offering: bySlug,
          active,
          priceId: priceId ?? null,
        });
      }
    }
    return null;
  }

  return finalizeHydratedMembership({
    userId,
    offering,
    active,
    priceId: priceId ?? null,
  });
}

async function finalizeHydratedMembership(params: {
  userId: string;
  offering: { id: string; slug: string; name: string };
  active: { id: string; status: string };
  priceId: string | null;
}): Promise<ActiveMembership> {
  const supabase = createServiceClient();
  const stripe = getStripe();
  let periodEnd: string | null = null;

  if (stripe) {
    const sub = await stripe.subscriptions.retrieve(params.active.id);
    const end = (sub as { current_period_end?: number }).current_period_end;
    if (end) periodEnd = new Date(end * 1000).toISOString();
  }

  await supabase.from(MA5_TABLES.memberships).upsert(
    {
      user_id: params.userId,
      product_id: params.offering.id,
      status: params.active.status === "trialing" ? "trialing" : "active",
      stripe_subscription_id: params.active.id,
      stripe_price_id: params.priceId,
      current_period_end: periodEnd,
    },
    { onConflict: "stripe_subscription_id" },
  );

  return {
    productSlug: params.offering.slug,
    productName: params.offering.name,
    status: params.active.status === "trialing" ? "trialing" : "active",
    currentPeriodEnd: periodEnd,
  };
}
