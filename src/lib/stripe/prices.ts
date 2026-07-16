/**
 * Maps MA5 product slugs to Stripe Price IDs.
 * Set these in env after creating Products in the Stripe Dashboard (test mode).
 */
export const MEMBERSHIP_PRICE_ENV: Record<string, string> = {
  "sg-14": "STRIPE_PRICE_SG_14",
  "sg-12": "STRIPE_PRICE_SG_12",
  "sg-8": "STRIPE_PRICE_SG_8",
  "sg-4": "STRIPE_PRICE_SG_4",
  "og-standard": "STRIPE_PRICE_OG_STANDARD",
  "og-household": "STRIPE_PRICE_OG_HOUSEHOLD",
  "og-small-group": "STRIPE_PRICE_OG_SMALL_GROUP",
  "og-semi-private": "STRIPE_PRICE_OG_SEMI_PRIVATE",
};

export function getStripePriceIdForProduct(slug: string): string | undefined {
  const envName = MEMBERSHIP_PRICE_ENV[slug];
  if (!envName) return undefined;
  const value = process.env[envName];
  return value && value.trim() ? value.trim() : undefined;
}

export function getProductSlugForStripePriceId(
  priceId: string,
): string | undefined {
  const target = priceId.trim();
  if (!target) return undefined;
  for (const [slug, envName] of Object.entries(MEMBERSHIP_PRICE_ENV)) {
    const value = process.env[envName]?.trim();
    if (value && value === target) return slug;
  }
  return undefined;
}

export function parsePriceToCents(price: string): number {
  const cleaned = price.replace(/[^0-9.]/g, "");
  const dollars = Number.parseFloat(cleaned);
  if (Number.isNaN(dollars)) return 0;
  return Math.round(dollars * 100);
}
