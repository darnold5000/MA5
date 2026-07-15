import { cookies } from "next/headers";

import type { BookingItem } from "@/features/scheduling/fallback-data";

export const DEMO_BOOKINGS_COOKIE = "ma5_demo_bookings";

const MAX_DEMO_BOOKINGS = 40;

export function parseDemoBookingsCookie(raw: string | undefined): BookingItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as BookingItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (b) =>
        b &&
        typeof b.id === "string" &&
        typeof b.confirmationNumber === "string" &&
        typeof b.sessionTitle === "string",
    );
  } catch {
    return [];
  }
}

export async function readDemoBookings(): Promise<BookingItem[]> {
  const jar = await cookies();
  return parseDemoBookingsCookie(jar.get(DEMO_BOOKINGS_COOKIE)?.value);
}

export function serializeDemoBookings(bookings: BookingItem[]): string {
  return JSON.stringify(bookings.slice(0, MAX_DEMO_BOOKINGS));
}
