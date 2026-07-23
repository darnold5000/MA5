export type ClassType = {
  id: string;
  slug: string;
  name: string;
  description: string;
  defaultDurationMinutes: number;
  defaultCapacity: number;
  defaultPriceCents: number;
};

export type SessionItem = {
  id: string;
  classTypeId: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  /** Session length in minutes (shown on cards; drives endsAt). */
  durationMinutes: number;
  capacity: number;
  bookedCount: number;
  priceCents: number;
  locationName: string;
  status: "draft" | "published" | "full" | "cancelled" | "completed";
  coachName: string;
  source: "demo" | "database";
};

export type ProductItem = {
  id: string;
  slug: string;
  name: string;
  description: string;
  productType: "membership" | "package" | "drop_in" | "addon";
  priceCents: number;
  billingInterval: "month" | "one_time" | null;
  sessionCredits: number | null;
  stripePriceConfigured: boolean;
  source: "demo" | "database";
};

export type BookingItem = {
  id: string;
  sessionId: string;
  sessionTitle: string;
  startsAt: string;
  confirmationNumber: string;
  status: string;
  paymentStatus: string;
  amountCents: number;
  source: "demo" | "database";
};

export type MembershipItem = {
  id: string;
  productName: string;
  productSlug: string;
  status: string;
  currentPeriodEnd: string | null;
  source: "demo" | "database";
};
