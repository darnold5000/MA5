/**
 * Marketing → Fitness Hub booking entry points.
 * Website CTAs go straight to /app/schedule (auth gate → login with next).
 * No intermediate /book page.
 */

export type BookingTypeQuery =
  | "assessment"
  | "small-group"
  | "semi-private"
  | "sports-performance"
  | "inbody"
  | "sauna"
  | "open-gym";

const SERVICE_BY_QUERY: Record<BookingTypeQuery, string | null> = {
  assessment: "ct-assessment",
  "small-group": "ct-small-group",
  "semi-private": "ct-semi-private",
  "sports-performance": "ct-sports",
  inbody: "ct-inbody",
  sauna: "ct-sauna",
  "open-gym": "ct-open-gym",
};

/** Primary Book CTA — full schedule in Fitness Hub. */
export const BOOKING_HUB_PATH = "/app/schedule";

/**
 * Resolve a marketing booking type to an in-app (or marketing) destination.
 * Unauthenticated visitors hit login with `next` preserved by middleware.
 */
export function getBookingHref(type?: string | null): string {
  if (!type) return BOOKING_HUB_PATH;

  if (type === "open-gym") return "/open-gym";

  const service =
    SERVICE_BY_QUERY[type as BookingTypeQuery] ??
    (type.startsWith("ct-") ? type : null);

  if (service) return `${BOOKING_HUB_PATH}?service=${service}`;

  return BOOKING_HUB_PATH;
}
