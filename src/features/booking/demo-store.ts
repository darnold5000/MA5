import { cookies } from "next/headers";

import { allowDemoFallbacks } from "@/lib/tenant/runtime-data";
import type { BookingItem } from "@/features/scheduling/types";

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
  if (!allowDemoFallbacks()) return [];
  const jar = await cookies();
  return parseDemoBookingsCookie(jar.get(DEMO_BOOKINGS_COOKIE)?.value);
}

export function serializeDemoBookings(bookings: BookingItem[]): string {
  return JSON.stringify(bookings.slice(0, MAX_DEMO_BOOKINGS));
}
