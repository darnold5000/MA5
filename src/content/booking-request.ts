/**
 * Public intake bookings (email / lead form) — not Fitness Hub self-serve schedule.
 */

export const BOOKING_REQUEST_PATH = "/book";

export const BOOKING_REQUEST_SERVICES = [
  {
    value: "consultation",
    label: "Free consultation",
  },
  {
    value: "assessment",
    label: "Fitness assessment",
  },
  {
    value: "inbody",
    label: "InBody scan",
  },
  {
    value: "sports-performance",
    label: "Sports performance consultation",
  },
  {
    value: "other",
    label: "Not sure yet / other",
  },
] as const;

export type BookingRequestService =
  (typeof BOOKING_REQUEST_SERVICES)[number]["value"];

/** Marketing `bookingType` values that should use the booking request form. */
export const INTAKE_BOOKING_TYPES = new Set<string>([
  "assessment",
  "consultation",
  "inbody",
  "sports-performance",
]);

export function isBookingRequestService(
  value: string | null | undefined,
): value is BookingRequestService {
  return BOOKING_REQUEST_SERVICES.some((s) => s.value === value);
}

export function bookingRequestServiceLabel(value: string): string {
  return (
    BOOKING_REQUEST_SERVICES.find((s) => s.value === value)?.label ?? value
  );
}

export function bookingRequestHref(service?: string | null): string {
  if (service && isBookingRequestService(service)) {
    return `${BOOKING_REQUEST_PATH}?service=${service}`;
  }
  return BOOKING_REQUEST_PATH;
}
