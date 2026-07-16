import { getCatalogProducts } from "@/features/memberships/catalog";
import { getStripe } from "@/lib/stripe";
import {
  getProductSlugForStripePriceId,
  getStripePriceIdForProduct,
} from "@/lib/stripe/prices";
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

async function ensureProductRow(slug: string) {
  const catalog = getCatalogProducts().find((p) => p.slug === slug);
  if (!catalog) return null;

  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from(MA5_TABLES.products)
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const { data: inserted } = await supabase
    .from(MA5_TABLES.products)
    .insert({
      slug: catalog.slug,
      name: catalog.name,
      description: catalog.description,
      product_type: catalog.productType,
      price_cents: catalog.priceCents,
      billing_interval: catalog.billingInterval,
      session_credits: catalog.sessionCredits,
      stripe_price_id: getStripePriceIdForProduct(slug) ?? null,
      active: true,
    })
    .select("id")
    .single();

  return (inserted?.id as string | undefined) ?? null;
}

/** Sync membership after Stripe Checkout return (works without webhook). */
export async function syncMembershipFromCheckoutSession(
  sessionId: string,
  userId: string,
): Promise<ActiveMembership | null> {
  if (!isSupabaseConfigured()) return null;

  const stripe = getStripe();
  if (!stripe) return null;

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items", "subscription"],
  });

  if (session.payment_status !== "paid" && session.status !== "complete") {
    return null;
  }

  const metaUser = session.metadata?.user_id ?? session.client_reference_id;
  if (metaUser && metaUser !== userId) {
    return null;
  }

  const productSlug =
    session.metadata?.product_slug ??
    (() => {
      const priceId = session.line_items?.data?.[0]?.price?.id;
      return priceId ? getProductSlugForStripePriceId(priceId) : undefined;
    })();

  if (!productSlug) return null;

  const productId = await ensureProductRow(productSlug);
  if (!productId) return null;

  const supabase = createServiceClient();
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;

  if (customerId) {
    await supabase
      .from(MA5_TABLES.profiles)
      .update({ stripe_customer_id: customerId })
      .eq("id", userId);
  }

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  const priceId =
    session.line_items?.data?.[0]?.price &&
    typeof session.line_items.data[0].price !== "string"
      ? session.line_items.data[0].price.id
      : null;

  let periodEnd: string | null = null;
  if (subscriptionId) {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const end = (sub as { current_period_end?: number }).current_period_end;
    if (end) periodEnd = new Date(end * 1000).toISOString();
  }

  const row = {
    user_id: userId,
    product_id: productId,
    status: "active" as const,
    stripe_subscription_id: subscriptionId,
    stripe_price_id: priceId,
    current_period_end: periodEnd,
  };

  if (subscriptionId) {
    await supabase.from(MA5_TABLES.memberships).upsert(row, {
      onConflict: "stripe_subscription_id",
    });
  } else {
    await supabase.from(MA5_TABLES.memberships).insert(row);
  }

  const catalog = getCatalogProducts().find((p) => p.slug === productSlug);
  return {
    productSlug,
    productName: catalog?.name ?? productSlug,
    status: "active",
    currentPeriodEnd: periodEnd,
  };
}

export async function getActiveMembershipForUser(
  userId: string,
): Promise<ActiveMembership | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from(MA5_TABLES.memberships)
      .select("status, current_period_end, ma5_products(name, slug)")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
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
    }

    // Fallback: subscription exists in Stripe but webhook/DB sync never ran.
    return hydrateMembershipFromStripeCustomer(userId);
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
    (s) => s.status === "active" || s.status === "trialing",
  );
  if (!active) return null;

  const priceId = active.items.data[0]?.price?.id;
  const productSlug = priceId
    ? getProductSlugForStripePriceId(priceId)
    : undefined;
  if (!productSlug) return null;

  const productId = await ensureProductRow(productSlug);
  if (!productId) return null;

  const periodEndRaw = (active as unknown as { current_period_end?: number })
    .current_period_end;
  const periodEnd = periodEndRaw
    ? new Date(periodEndRaw * 1000).toISOString()
    : null;

  await supabase.from(MA5_TABLES.memberships).upsert(
    {
      user_id: userId,
      product_id: productId,
      status: active.status === "trialing" ? "trialing" : "active",
      stripe_subscription_id: active.id,
      stripe_price_id: priceId ?? null,
      current_period_end: periodEnd,
    },
    { onConflict: "stripe_subscription_id" },
  );

  const catalog = getCatalogProducts().find((p) => p.slug === productSlug);
  return {
    productSlug,
    productName: catalog?.name ?? productSlug,
    status: active.status === "trialing" ? "trialing" : "active",
    currentPeriodEnd: periodEnd,
  };
}
