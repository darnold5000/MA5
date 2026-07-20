/**
 * Marketing → booking destinations.
 * Intake services (assessment, InBody, consultations) → /book request form (emailed to staff).
 * Member bookable sessions → Fitness Hub Reserve.
 */

import {
  BOOKING_REQUEST_PATH,
  INTAKE_BOOKING_TYPES,
  bookingRequestHref,
  isBookingRequestService,
} from "@/content/booking-request";

export type BookingTypeQuery =
  | "assessment"
  | "consultation"
  | "small-group"
  | "semi-private"
  | "sports-performance"
  | "inbody"
  | "sauna"
  | "open-gym";

const MEMBER_SERVICE_BY_QUERY: Record<string, string> = {
  "small-group": "ct-small-group",
  "semi-private": "ct-semi-private",
  sauna: "ct-sauna",
  "open-gym": "ct-open-gym",
};

/** Signed-in members book sessions here. */
export const BOOKING_HUB_PATH = "/app/schedule";

/**
 * Resolve a marketing booking type to an in-app or marketing destination.
 */
export function getBookingHref(type?: string | null): string {
  if (!type) return BOOKING_REQUEST_PATH;

  if (type === "open-gym") return "/open-gym";

  if (INTAKE_BOOKING_TYPES.has(type)) {
    const service =
      type === "assessment" || type === "consultation"
        ? type
        : isBookingRequestService(type)
          ? type
          : null;
    return bookingRequestHref(service);
  }

  const service = MEMBER_SERVICE_BY_QUERY[type];
  if (service) return `${BOOKING_HUB_PATH}?service=${service}`;

  if (type.startsWith("ct-")) {
    return `${BOOKING_HUB_PATH}?service=${type}`;
  }

  return BOOKING_REQUEST_PATH;
}
