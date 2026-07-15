import type { Metadata } from "next";

import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { readDemoBookings } from "@/features/booking/demo-store";
import {
  formatMoney,
  formatSessionWhen,
  listUserBookings,
} from "@/features/scheduling/queries";
import type { BookingItem } from "@/features/scheduling/fallback-data";

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
    (b.startsAt || "").localeCompare(a.startsAt || ""),
  );
}

export default async function BookingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const configured = isSupabasePublicConfigured();
  const session = configured ? await getSessionUser() : null;
  const stored = configured
    ? await listUserBookings(session?.id ?? null)
    : [];
  // In demo mode, only show bookings the visitor actually made (cookie),
  // not the static sample roster.
  const demoCookie = await readDemoBookings();
  const bookings = configured
    ? mergeBookings(
        stored.filter((b) => b.source === "database"),
        demoCookie,
      )
    : demoCookie;

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
          Confirmed sessions on the MA5 platform.
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

      <div className="space-y-3">
        {bookings.length === 0 ? (
          <p className="text-sm text-muted">
            No bookings yet. Pick a session from the schedule to reserve a spot.
          </p>
        ) : (
          bookings.map((booking) => {
            const isNew = params.booked === booking.confirmationNumber;
            return (
              <article
                key={booking.id}
                className={
                  isNew
                    ? "border border-brand bg-surface p-5"
                    : "border border-border bg-surface p-5"
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
                    {booking.confirmationNumber}
                  </p>
                  {isNew ? (
                    <span className="text-[10px] font-semibold tracking-wide text-brand uppercase">
                      Just booked
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-1 font-display text-xl tracking-wide uppercase">
                  {booking.sessionTitle}
                </h3>
                <p className="mt-2 text-sm text-muted">
                  {booking.startsAt
                    ? formatSessionWhen(booking.startsAt)
                    : "Time TBD"}{" "}
                  · {booking.status}
                  {booking.paymentStatus === "pay_at_facility"
                    ? " · pay at facility"
                    : ` · ${booking.paymentStatus}`}
                  {booking.amountCents > 0
                    ? ` · ${formatMoney(booking.amountCents)}`
                    : ""}
                </p>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
