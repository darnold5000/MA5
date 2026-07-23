import { getStripe, isStripeConfigured } from "@/lib/billing/stripe-client";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";
import { isMa5DeploymentConfigured } from "@/lib/tenant/deployment";
import { withTenantId } from "@/lib/tenant/deployment";
import { createMa5TenantServiceClient } from "@/lib/tenant/service";

import {
  getOfferingById,
  listOfferings,
  mapProductRow,
} from "./catalog";
import type { Offering, OfferingInput, OfferingStatus } from "./types";
import { slugify } from "./types";

const PRODUCT_SELECT_COLS =
  "id, slug, name, description, product_type, category, payment_type, price_cents, currency, billing_interval, session_credits, status, stripe_product_id, current_stripe_price_id, display_order, archived_at, created_at, updated_at";

function adminDb() {
  if (isMa5DeploymentConfigured()) {
    return createMa5TenantServiceClient();
  }
  return {
    supabase: createServiceClient(),
    ctx: null as null,
  };
}

function productUpdateQuery(
  supabase: ReturnType<typeof createServiceClient>,
  tenantId: string | null,
  id: string,
  updates: Record<string, unknown>,
) {
  let query = supabase.from(MA5_TABLES.products).update(updates).eq("id", id);
  if (tenantId) query = query.eq("tenant_id", tenantId);
  return query;
}

function billingIntervalFor(input: {
  paymentType: OfferingInput["paymentType"];
  billingInterval?: OfferingInput["billingInterval"];
}) {
  if (input.paymentType === "one_time") return "one_time" as const;
  return input.billingInterval ?? ("month" as const);
}

async function createStripePrice(params: {
  stripeProductId: string;
  amountCents: number;
  currency: string;
  paymentType: OfferingInput["paymentType"];
  billingInterval: "month" | "one_time";
}) {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe is not configured");

  return stripe.prices.create({
    product: params.stripeProductId,
    unit_amount: params.amountCents,
    currency: params.currency,
    ...(params.paymentType === "subscription"
      ? { recurring: { interval: "month" } }
      : {}),
    metadata: {
      billing_interval: params.billingInterval,
    },
  });
}

/** Ensure Stripe Product + current Price exist for an offering. */
export async function syncOfferingToStripe(offeringId: string): Promise<Offering> {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured");
  }
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe unavailable");

  const offering = await getOfferingById(offeringId, { useServiceRole: true });
  if (!offering) throw new Error("Offering not found");

  const { supabase, ctx } = adminDb();
  const tenantId = ctx?.tenantId ?? null;
  let stripeProductId = offering.stripeProductId;
  let currentStripePriceId = offering.currentStripePriceId;

  if (!stripeProductId) {
    const product = await stripe.products.create({
      name: offering.name,
      description: offering.description ?? undefined,
      metadata: {
        ma5_product_id: offering.id,
        ma5_slug: offering.slug,
      },
    });
    stripeProductId = product.id;
  } else {
    await stripe.products.update(stripeProductId, {
      name: offering.name,
      description: offering.description ?? undefined,
    });
  }

  const interval = billingIntervalFor({
    paymentType: offering.paymentType,
    billingInterval: offering.billingInterval,
  });

  if (!currentStripePriceId) {
    const price = await createStripePrice({
      stripeProductId,
      amountCents: offering.priceCents,
      currency: offering.currency,
      paymentType: offering.paymentType,
      billingInterval: interval,
    });
    currentStripePriceId = price.id;

    await supabase.from(MA5_TABLES.prices).insert(
      (ctx
        ? withTenantId(ctx, {
            product_id: offering.id,
            stripe_price_id: price.id,
            amount_cents: offering.priceCents,
            currency: offering.currency,
            billing_interval: interval,
            active: true,
          })
        : {
            product_id: offering.id,
            stripe_price_id: price.id,
            amount_cents: offering.priceCents,
            currency: offering.currency,
            billing_interval: interval,
            active: true,
          }) as Record<string, unknown>,
    );
  }

  const { data, error } = await productUpdateQuery(
    supabase,
    tenantId,
    offering.id,
    {
      stripe_product_id: stripeProductId,
      current_stripe_price_id: currentStripePriceId,
    },
  )
    .select(PRODUCT_SELECT_COLS)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update offering Stripe IDs");
  }

  return mapProductRow(data);
}

export async function createOffering(input: OfferingInput): Promise<Offering> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }

  const { supabase, ctx } = adminDb();
  const slug = input.slug?.trim() || slugify(input.name);
  if (!slug) throw new Error("Slug is required");

  const interval = billingIntervalFor(input);
  const status: OfferingStatus = input.status ?? "active";

  const insertRow = {
    slug,
    name: input.name.trim(),
    description: input.description ?? null,
    product_type: input.productType,
    category: input.category ?? null,
    payment_type: input.paymentType,
    price_cents: input.priceCents,
    currency: input.currency ?? "usd",
    billing_interval: interval,
    session_credits: input.sessionCredits ?? null,
    status,
    active: status === "active",
    display_order: input.displayOrder ?? 0,
  };

  const { data, error } = await supabase
    .from(MA5_TABLES.products)
    .insert(ctx ? withTenantId(ctx, insertRow) : insertRow)
    .select(PRODUCT_SELECT_COLS)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create offering");
  }

  let offering = mapProductRow(data);

  if (isStripeConfigured()) {
    offering = await syncOfferingToStripe(offering.id);
  }

  return offering;
}

export async function updateOffering(
  id: string,
  patch: Partial<OfferingInput> & { status?: OfferingStatus },
): Promise<Offering> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }

  const existing = await getOfferingById(id, { useServiceRole: true });
  if (!existing) throw new Error("Offering not found");

  const { supabase, ctx } = adminDb();
  const tenantId = ctx?.tenantId ?? null;
  const nextPaymentType = patch.paymentType ?? existing.paymentType;
  const nextInterval = billingIntervalFor({
    paymentType: nextPaymentType,
    billingInterval:
      patch.billingInterval !== undefined
        ? patch.billingInterval
        : existing.billingInterval,
  });
  const nextAmount = patch.priceCents ?? existing.priceCents;
  const nextCurrency = patch.currency ?? existing.currency;
  const nextStatus = patch.status ?? existing.status;

  const nameChanged =
    patch.name !== undefined && patch.name.trim() !== existing.name;
  const descriptionChanged =
    patch.description !== undefined &&
    (patch.description ?? null) !== existing.description;
  const amountChanged = nextAmount !== existing.priceCents;
  const intervalChanged =
    nextInterval !== existing.billingInterval ||
    nextPaymentType !== existing.paymentType;

  const updates: Record<string, unknown> = {
    name: patch.name?.trim() ?? existing.name,
    description:
      patch.description !== undefined
        ? patch.description
        : existing.description,
    product_type: patch.productType ?? existing.productType,
    category:
      patch.category !== undefined ? patch.category : existing.category,
    payment_type: nextPaymentType,
    price_cents: nextAmount,
    currency: nextCurrency,
    billing_interval: nextInterval,
    session_credits:
      patch.sessionCredits !== undefined
        ? patch.sessionCredits
        : existing.sessionCredits,
    status: nextStatus,
    active: nextStatus === "active",
    display_order: patch.displayOrder ?? existing.displayOrder,
  };

  if (patch.slug?.trim()) {
    updates.slug = patch.slug.trim();
  }

  const { data, error } = await productUpdateQuery(supabase, tenantId, id, updates)
    .select(PRODUCT_SELECT_COLS)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update offering");
  }

  let offering = mapProductRow(data);

  if (!isStripeConfigured()) {
    return offering;
  }

  const stripe = getStripe();
  if (!stripe) return offering;

  // Ensure product exists first
  if (!offering.stripeProductId) {
    offering = await syncOfferingToStripe(offering.id);
  } else if (nameChanged || descriptionChanged) {
    await stripe.products.update(offering.stripeProductId, {
      name: offering.name,
      description: offering.description ?? undefined,
    });
  }

  if (amountChanged || intervalChanged) {
    const previousPriceId = offering.currentStripePriceId;

    if (previousPriceId) {
      try {
        await stripe.prices.update(previousPriceId, { active: false });
      } catch {
        // Price may already be inactive
      }
      await supabase
        .from(MA5_TABLES.prices)
        .update({ active: false })
        .eq("product_id", offering.id)
        .eq("active", true);
    }

    const price = await createStripePrice({
      stripeProductId: offering.stripeProductId!,
      amountCents: offering.priceCents,
      currency: offering.currency,
      paymentType: offering.paymentType,
      billingInterval: nextInterval,
    });

    await supabase.from(MA5_TABLES.prices).insert(
      (ctx
        ? withTenantId(ctx, {
            product_id: offering.id,
            stripe_price_id: price.id,
            amount_cents: offering.priceCents,
            currency: offering.currency,
            billing_interval: nextInterval,
            active: true,
          })
        : {
            product_id: offering.id,
            stripe_price_id: price.id,
            amount_cents: offering.priceCents,
            currency: offering.currency,
            billing_interval: nextInterval,
            active: true,
          }) as Record<string, unknown>,
    );

    const { data: updated, error: priceErr } = await productUpdateQuery(
      supabase,
      tenantId,
      offering.id,
      {
        current_stripe_price_id: price.id,
      },
    )
      .select(PRODUCT_SELECT_COLS)
      .single();

    if (priceErr || !updated) {
      throw new Error(priceErr?.message ?? "Failed to set new Stripe price");
    }
    offering = mapProductRow(updated);
  } else if (!offering.currentStripePriceId) {
    offering = await syncOfferingToStripe(offering.id);
  }

  return offering;
}

/**
 * Hide from customers (status inactive). Row and Stripe objects unchanged.
 */
export async function hideOffering(id: string): Promise<Offering> {
  return updateOffering(id, { status: "inactive" });
}

/** Make visible and available for purchase. */
export async function showOffering(id: string): Promise<Offering> {
  return updateOffering(id, { status: "active" });
}

/**
 * Retire from normal admin use. Row preserved; subscriptions unchanged.
 */
export async function archiveOffering(id: string): Promise<Offering> {
  return updateOffering(id, { status: "archived" });
}

/**
 * Return to admin list as Hidden so the owner can review before publishing.
 * Does not create Stripe objects — caller syncs only if IDs are missing.
 */
export async function restoreOffering(id: string): Promise<Offering> {
  return updateOffering(id, { status: "inactive" });
}

/**
 * Archive / hide / show / restore an offering in MA5 only.
 * Rows are never deleted. Lifecycle does not cancel Stripe subscriptions.
 */
export async function setOfferingStatus(
  id: string,
  status: OfferingStatus,
): Promise<Offering> {
  return updateOffering(id, { status });
}

export async function duplicateOffering(id: string): Promise<Offering> {
  const existing = await getOfferingById(id, { useServiceRole: true });
  if (!existing) throw new Error("Offering not found");

  const baseSlug = `${existing.slug}-copy`;
  let slug = baseSlug;
  let n = 2;
  const all = await listOfferings({
    includeArchived: true,
    useServiceRole: true,
  });
  const used = new Set(all.map((o) => o.slug));
  while (used.has(slug)) {
    slug = `${baseSlug}-${n}`;
    n += 1;
  }

  return createOffering({
    name: `${existing.name} (Copy)`,
    slug,
    description: existing.description,
    productType: existing.productType,
    category: existing.category,
    paymentType: existing.paymentType,
    priceCents: existing.priceCents,
    currency: existing.currency,
    billingInterval: existing.billingInterval,
    sessionCredits: existing.sessionCredits,
    status: "draft",
    displayOrder: existing.displayOrder + 1,
  });
}

/** Sync all offerings that are missing Stripe Product/Price IDs. */
export async function syncMissingStripeOfferings(): Promise<{
  synced: number;
  errors: { id: string; slug: string; error: string }[];
}> {
  const offerings = await listOfferings({
    includeArchived: true,
    useServiceRole: true,
  });
  const missing = offerings.filter(
    (o) => !o.stripeProductId || !o.currentStripePriceId,
  );

  let synced = 0;
  const errors: { id: string; slug: string; error: string }[] = [];

  for (const offering of missing) {
    try {
      await syncOfferingToStripe(offering.id);
      synced += 1;
    } catch (err) {
      errors.push({
        id: offering.id,
        slug: offering.slug,
        error: err instanceof Error ? err.message : "Sync failed",
      });
    }
  }

  return { synced, errors };
}
