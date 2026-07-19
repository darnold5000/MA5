export type PaymentType = "one_time" | "subscription";
export type OfferingStatus = "draft" | "active" | "inactive" | "archived";
export type ProductType = "membership" | "package" | "drop_in" | "addon";
export type BillingInterval = "month" | "one_time";

export type Offering = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  productType: ProductType;
  category: string | null;
  paymentType: PaymentType;
  priceCents: number;
  currency: string;
  billingInterval: BillingInterval | null;
  sessionCredits: number | null;
  status: OfferingStatus;
  stripeProductId: string | null;
  currentStripePriceId: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type OfferingInput = {
  name: string;
  slug?: string;
  description?: string | null;
  productType: ProductType;
  category?: string | null;
  paymentType: PaymentType;
  priceCents: number;
  currency?: string;
  billingInterval?: BillingInterval | null;
  sessionCredits?: number | null;
  status?: OfferingStatus;
  displayOrder?: number;
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
