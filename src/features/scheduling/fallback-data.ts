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

function daysFromNow(days: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export const FALLBACK_CLASS_TYPES: ClassType[] = [
  {
    id: "ct-assessment",
    slug: "assessment",
    name: "Fitness Assessment",
    description: "Start here if you are new to MA5 or returning after time away.",
    defaultDurationMinutes: 60,
    defaultCapacity: 1,
    defaultPriceCents: 0,
  },
  {
    id: "ct-small-group",
    slug: "small-group",
    name: "Small Group Training",
    description: "Coached group sessions with limited capacity.",
    defaultDurationMinutes: 60,
    defaultCapacity: 10,
    defaultPriceCents: 3000,
  },
  {
    id: "ct-sports",
    slug: "sports-performance",
    name: "Sports Performance",
    description: "Athlete-focused speed, strength, and sport-specific work.",
    defaultDurationMinutes: 60,
    defaultCapacity: 8,
    defaultPriceCents: 0,
  },
  {
    id: "ct-inbody",
    slug: "inbody",
    name: "InBody Scan",
    description: "Body composition scan appointment.",
    defaultDurationMinutes: 30,
    defaultCapacity: 1,
    defaultPriceCents: 2500,
  },
  {
    id: "ct-sauna",
    slug: "sauna",
    name: "Infrared Sauna",
    description: "Recovery session in the infrared sauna.",
    defaultDurationMinutes: 45,
    defaultCapacity: 1,
    defaultPriceCents: 0,
  },
];

function makeSession(
  id: string,
  classType: ClassType,
  days: number,
  hour: number,
  bookedCount: number,
): SessionItem {
  const start = daysFromNow(days, hour);
  const end = new Date(start.getTime() + classType.defaultDurationMinutes * 60_000);
  return {
    id,
    classTypeId: classType.id,
    title: classType.name,
    description: classType.description,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    durationMinutes: classType.defaultDurationMinutes,
    capacity: classType.defaultCapacity,
    bookedCount,
    priceCents: classType.defaultPriceCents,
    locationName: "MA5 Performance — Avon, IN",
    status: bookedCount >= classType.defaultCapacity ? "full" : "published",
    coachName: "Robert Anderson",
    source: "demo",
  };
}

const assessment = FALLBACK_CLASS_TYPES[0];
const smallGroup = FALLBACK_CLASS_TYPES[1];
const sports = FALLBACK_CLASS_TYPES[2];
const inbody = FALLBACK_CLASS_TYPES[3];
const sauna = FALLBACK_CLASS_TYPES[4];

export const FALLBACK_SESSIONS: SessionItem[] = [
  makeSession("sess-assess-1", assessment, 1, 9, 0),
  makeSession("sess-assess-2", assessment, 3, 17, 0),
  makeSession("sess-sg-1", smallGroup, 1, 6, 4),
  makeSession("sess-sg-2", smallGroup, 2, 18, 7),
  makeSession("sess-sg-3", smallGroup, 4, 6, 2),
  makeSession("sess-sports-1", sports, 2, 16, 3),
  makeSession("sess-inbody-1", inbody, 5, 10, 0),
  makeSession("sess-sauna-1", sauna, 2, 19, 0),
  makeSession("sess-sauna-2", sauna, 6, 12, 0),
];

export const FALLBACK_BOOKINGS: BookingItem[] = [
  {
    id: "book-demo-1",
    sessionId: "sess-sg-1",
    sessionTitle: "Small Group Training",
    startsAt: FALLBACK_SESSIONS[2].startsAt,
    confirmationNumber: "MA5-DEMO-1001",
    status: "confirmed",
    paymentStatus: "pay_at_facility",
    amountCents: 3000,
    source: "demo",
  },
];
