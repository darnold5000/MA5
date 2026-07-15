import { trainingPricingGroups } from "@/content/pricing";
import {
  getStripePriceIdForProduct,
  parsePriceToCents,
} from "@/lib/stripe/prices";
import type { ProductItem } from "@/features/scheduling/fallback-data";

export function getCatalogProducts(): ProductItem[] {
  const products: ProductItem[] = [];

  for (const group of trainingPricingGroups) {
    for (const item of group.items) {
      const isDropIn = item.id.includes("drop-in") || item.cadence === "/ session";
      const isAddon = item.id.startsWith("og-") && item.id !== "og-standard";
      products.push({
        id: `prod-${item.id}`,
        slug: item.id,
        name: item.name,
        description: item.detail ?? group.description ?? group.title,
        productType: isDropIn ? "drop_in" : isAddon ? "addon" : "membership",
        priceCents: parsePriceToCents(item.price),
        billingInterval: isDropIn ? "one_time" : "month",
        sessionCredits: null,
        stripePriceConfigured: Boolean(getStripePriceIdForProduct(item.id)),
        source: "demo",
      });
    }
  }

  return products;
}
