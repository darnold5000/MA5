import type { Metadata } from "next";

import { BookingsPanel } from "@/components/booking/bookings-panel";
import { readDemoBookings } from "@/features/booking/demo-store";
import type { BookingItem } from "@/features/scheduling/fallback-data";
import { listUserBookings } from "@/features/scheduling/queries";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "My bookings",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ booked?: string }>;
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
        <h2 className="font-display text-3xl tracking-wide uppercase">
          My bookings
        </h2>
        <p className="mt-2 text-sm text-muted">
          Upcoming sessions first, with calendar days marked for anything you’ve
          reserved.
        </p>
        {params.booked ? (
          <p
            className="mt-3 text-sm text-foreground"
            role="status"
            aria-live="polite"
          >
            {justBooked ? (
              <>
                Booked{" "}
                <span className="font-semibold">{justBooked.sessionTitle}</span>
                {" — "}
                confirmation{" "}
                <span className="font-mono text-brand">{params.booked}</span>
              </>
            ) : (
              <>
                Booking confirmed —{" "}
                <span className="font-mono text-brand">{params.booked}</span>
              </>
            )}
          </p>
        ) : null}
      </div>

      <BookingsPanel
        bookings={bookings}
        justBookedConfirmation={params.booked}
      />
    </div>
  );
}
