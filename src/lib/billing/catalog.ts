import {
  createClient,
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

import type {
  BillingInterval,
  Offering,
  OfferingStatus,
  PaymentType,
  ProductType,
} from "./types";

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  product_type: string;
  category: string | null;
  payment_type: string;
  price_cents: number;
  currency: string;
  billing_interval: string | null;
  session_credits: number | null;
  status: string;
  stripe_product_id: string | null;
  current_stripe_price_id: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export function mapProductRow(row: ProductRow): Offering {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    productType: row.product_type as ProductType,
    category: row.category,
    paymentType: row.payment_type as PaymentType,
    priceCents: row.price_cents,
    currency: row.currency,
    billingInterval: (row.billing_interval as BillingInterval | null) ?? null,
    sessionCredits: row.session_credits,
    status: row.status as OfferingStatus,
    stripeProductId: row.stripe_product_id,
    currentStripePriceId: row.current_stripe_price_id,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_COLS =
  "id, slug, name, description, product_type, category, payment_type, price_cents, currency, billing_interval, session_credits, status, stripe_product_id, current_stripe_price_id, display_order, created_at, updated_at";

export async function listOfferings(options?: {
  includeArchived?: boolean;
  activeOnly?: boolean;
  useServiceRole?: boolean;
}): Promise<Offering[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = options?.useServiceRole
    ? createServiceClient()
    : await createClient();

  let query = supabase
    .from(MA5_TABLES.products)
    .select(SELECT_COLS)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (options?.activeOnly) {
    query = query.eq("status", "active");
  } else if (!options?.includeArchived) {
    query = query.neq("status", "archived");
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return (data as ProductRow[]).map(mapProductRow);
}

export async function listActiveOfferings(): Promise<Offering[]> {
  // Public/storefront reads use the anon/user client; RLS allows active rows.
  // Fall back to service role when the cookie client is unavailable.
  try {
    return await listOfferings({ activeOnly: true, useServiceRole: false });
  } catch {
    return listOfferings({ activeOnly: true, useServiceRole: true });
  }
}

export async function getOfferingBySlug(
  slug: string,
  options?: { activeOnly?: boolean; useServiceRole?: boolean },
): Promise<Offering | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = options?.useServiceRole
    ? createServiceClient()
    : await createClient();

  let query = supabase
    .from(MA5_TABLES.products)
    .select(SELECT_COLS)
    .eq("slug", slug);

  if (options?.activeOnly) {
    query = query.eq("status", "active");
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return mapProductRow(data as ProductRow);
}

export async function getOfferingById(
  id: string,
  options?: { useServiceRole?: boolean },
): Promise<Offering | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = options?.useServiceRole
    ? createServiceClient()
    : await createClient();

  const { data, error } = await supabase
    .from(MA5_TABLES.products)
    .select(SELECT_COLS)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapProductRow(data as ProductRow);
}

export async function getOfferingByStripePriceId(
  stripePriceId: string,
): Promise<Offering | null> {
  if (!isSupabaseConfigured() || !stripePriceId) return null;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from(MA5_TABLES.products)
    .select(SELECT_COLS)
    .eq("current_stripe_price_id", stripePriceId)
    .maybeSingle();

  if (!error && data) return mapProductRow(data as ProductRow);

  const { data: priceRow } = await supabase
    .from(MA5_TABLES.prices)
    .select("product_id")
    .eq("stripe_price_id", stripePriceId)
    .maybeSingle();

  if (!priceRow?.product_id) return null;
  return getOfferingById(priceRow.product_id as string, { useServiceRole: true });
}
