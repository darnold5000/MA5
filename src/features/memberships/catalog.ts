import { listActiveOfferings } from "@/lib/billing/catalog";
import type { ProductItem } from "@/features/scheduling/fallback-data";

/** @deprecated Use listActiveOfferings / listProducts (DB) instead. */
export async function getCatalogProducts(): Promise<ProductItem[]> {
  const offerings = await listActiveOfferings();
  return offerings.map((o) => ({
    id: o.id,
    slug: o.slug,
    name: o.name,
    description: o.description ?? "",
    productType: o.productType,
    priceCents: o.priceCents,
    billingInterval: o.billingInterval,
    sessionCredits: o.sessionCredits,
    stripePriceConfigured: Boolean(o.currentStripePriceId),
    source: "database" as const,
  }));
}
