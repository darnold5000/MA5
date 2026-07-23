import { MA5_TABLES } from "@/lib/supabase/tables";
import {
  applyTenantFilter,
  resolveCatalogDb,
} from "@/lib/tenant/catalog";
import {
  isMa5DeploymentConfigured,
  requireMa5TenantId,
  withTenantId,
} from "@/lib/tenant/deployment";
import { createMa5TenantServiceClient } from "@/lib/tenant/service";
import { isSupabaseConfigured } from "@/lib/supabase/server";

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
  archived_at: string | null;
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
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_COLS =
  "id, slug, name, description, product_type, category, payment_type, price_cents, currency, billing_interval, session_credits, status, stripe_product_id, current_stripe_price_id, display_order, archived_at, created_at, updated_at";

export async function listOfferings(options?: {
  includeArchived?: boolean;
  activeOnly?: boolean;
  useServiceRole?: boolean;
}): Promise<Offering[]> {
  if (!isSupabaseConfigured()) return [];

  const { supabase, tenantId } = await resolveCatalogDb(options);

  let query = applyTenantFilter(
    supabase.from(MA5_TABLES.products).select(SELECT_COLS),
    tenantId,
  )
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

  const { supabase, tenantId } = await resolveCatalogDb(options);

  let query = applyTenantFilter(
    supabase.from(MA5_TABLES.products).select(SELECT_COLS),
    tenantId,
  ).eq("slug", slug);

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

  const { supabase, tenantId } = await resolveCatalogDb(options);

  const { data, error } = await applyTenantFilter(
    supabase.from(MA5_TABLES.products).select(SELECT_COLS),
    tenantId,
  )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapProductRow(data as ProductRow);
}

export async function getOfferingByStripePriceId(
  stripePriceId: string,
): Promise<Offering | null> {
  if (!isSupabaseConfigured() || !stripePriceId) return null;

  const { supabase, tenantId } = await resolveCatalogDb({
    useServiceRole: true,
  });

  const { data, error } = await applyTenantFilter(
    supabase.from(MA5_TABLES.products).select(SELECT_COLS),
    tenantId,
  )
    .eq("current_stripe_price_id", stripePriceId)
    .maybeSingle();

  if (!error && data) return mapProductRow(data as ProductRow);

  const { data: priceRow } = await applyTenantFilter(
    supabase.from(MA5_TABLES.prices).select("product_id"),
    tenantId,
  )
    .eq("stripe_price_id", stripePriceId)
    .maybeSingle();

  if (!priceRow?.product_id) return null;
  return getOfferingById(priceRow.product_id as string, { useServiceRole: true });
}

export function commerceStripeMetadata(
  input: Record<string, string | null | undefined>,
): Record<string, string> {
  const meta: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value != null && value !== "") meta[key] = value;
  }
  if (isMa5DeploymentConfigured()) {
    meta.tenant_id = requireMa5TenantId();
  }
  return meta;
}

export function withCommerceTenant<T extends Record<string, unknown>>(
  row: T,
): T & { tenant_id?: string } {
  if (!isMa5DeploymentConfigured()) return row;
  const { ctx } = createMa5TenantServiceClient();
  return withTenantId(ctx, row);
}
