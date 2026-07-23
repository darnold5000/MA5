export type {
  BookingItem,
  ClassType,
  MembershipItem,
  ProductItem,
  SessionItem,
} from "@/features/scheduling/types";

import type { BookingItem, ClassType, SessionItem } from "@/features/scheduling/types";
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
  {
    id: "ct-semi-private",
    slug: "semi-private",
    name: "Semi-Private Training",
    description: "Coached session with a small client-to-coach ratio.",
    defaultDurationMinutes: 60,
    defaultCapacity: 4,
    defaultPriceCents: 0,
  },
  {
    id: "ct-open-gym",
    slug: "open-gym",
    name: "Open Gym",
    description: "Reserved floor time in the private training facility.",
    defaultDurationMinutes: 60,
    defaultCapacity: 6,
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

function classType(id: string): ClassType {
  const found = FALLBACK_CLASS_TYPES.find((t) => t.id === id);
  if (!found) throw new Error(`Unknown class type: ${id}`);
  return found;
}

export const FALLBACK_SESSIONS: SessionItem[] = [
  makeSession("sess-assess-1", classType("ct-assessment"), 1, 9, 0),
  makeSession("sess-assess-2", classType("ct-assessment"), 3, 17, 0),
  makeSession("sess-sg-1", classType("ct-small-group"), 1, 6, 4),
  makeSession("sess-sg-2", classType("ct-small-group"), 2, 18, 7),
  makeSession("sess-sg-3", classType("ct-small-group"), 4, 6, 2),
  makeSession("sess-sports-1", classType("ct-sports"), 2, 16, 3),
  makeSession("sess-inbody-1", classType("ct-inbody"), 5, 10, 0),
  makeSession("sess-sauna-1", classType("ct-sauna"), 2, 19, 0),
  makeSession("sess-sauna-2", classType("ct-sauna"), 6, 12, 0),
  makeSession("sess-semi-1", classType("ct-semi-private"), 1, 10, 2),
  makeSession("sess-semi-2", classType("ct-semi-private"), 3, 7, 1),
  makeSession("sess-og-1", classType("ct-open-gym"), 2, 8, 3),
  makeSession("sess-og-2", classType("ct-open-gym"), 5, 14, 0),
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
