import type { Metadata } from "next";

import { BookingCelebration } from "@/components/booking/booking-celebration";
import { BookingsPanel } from "@/components/booking/bookings-panel";
import { readDemoBookings } from "@/features/booking/demo-store";
import type { BookingItem } from "@/features/scheduling/fallback-data";
import { listUserBookings } from "@/features/scheduling/queries";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "My Training",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{
    booked?: string;
    paid?: string;
  }>;
};

function mergeBookings(
  stored: BookingItem[],
  demoCookie: BookingItem[],
): BookingItem[] {
  const byId = new Map<string, BookingItem>();
  for (const booking of [...demoCookie, ...stored]) {
    byId.set(booking.id, booking);
  }
  return Array.from(byId.values()).sort((a, b) =>
    (a.startsAt || "").localeCompare(b.startsAt || ""),
  );
}

export default async function BookingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const configured = isSupabasePublicConfigured();
  const session = configured ? await getSessionUser() : null;
  const stored = configured
    ? await listUserBookings(session?.id ?? null)
    : [];
  const demoCookie = await readDemoBookings();
  const bookings = configured
    ? mergeBookings(
        stored.filter((b) => b.source === "database"),
        demoCookie,
      )
    : mergeBookings([], demoCookie);

  const justBooked = params.booked
    ? bookings.find((b) => b.confirmationNumber === params.booked)
    : undefined;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          My training
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase">
          Your schedule
        </h1>
        <p className="mt-2 text-sm text-muted">
          Everything you’ve reserved, in the order it happens.
        </p>
      </div>

      {justBooked || params.paid === "1" ? (
        <BookingCelebration
          title={justBooked?.sessionTitle ?? "Your session"}
          startsAt={justBooked?.startsAt}
          paid={params.paid === "1"}
        />
      ) : null}

      <BookingsPanel
        bookings={bookings}
        justBookedConfirmation={params.booked}
      />
    </div>
  );
}
