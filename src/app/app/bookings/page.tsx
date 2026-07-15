import type { Metadata } from "next";

import { StatusBanner } from "@/components/platform/status-banner";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import {
  formatMoney,
  formatSessionWhen,
  listUserBookings,
} from "@/features/scheduling/queries";

export const metadata: Metadata = {
  title: "My bookings",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ booked?: string; demo?: string }>;
};

export default async function BookingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const configured = isSupabasePublicConfigured();
  const session = configured ? await getSessionUser() : null;
  const bookings = await listUserBookings(session?.id ?? null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl tracking-wide uppercase">
          My bookings
        </h2>
        <p className="mt-2 text-sm text-muted">
          Confirmed sessions on the MA5 platform.
        </p>
      </div>

      {params.booked ? (
        <StatusBanner title="Booked">
          Confirmation <strong>{params.booked}</strong>
          {params.demo
            ? " (demo mode — not written to the database yet)."
            : " saved."}
        </StatusBanner>
      ) : null}

      <div className="space-y-3">
        {bookings.length === 0 ? (
          <p className="text-sm text-muted">No bookings yet.</p>
        ) : (
          bookings.map((booking) => (
            <article
              key={booking.id}
              className="border border-border bg-surface p-5"
            >
              <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
                {booking.confirmationNumber}
              </p>
              <h3 className="mt-1 font-display text-xl tracking-wide uppercase">
                {booking.sessionTitle}
              </h3>
              <p className="mt-2 text-sm text-muted">
                {booking.startsAt
                  ? formatSessionWhen(booking.startsAt)
                  : "Time TBD"}{" "}
                · {booking.status} · {booking.paymentStatus}
                {booking.amountCents > 0
                  ? ` · ${formatMoney(booking.amountCents)}`
                  : ""}
                {booking.source === "demo" ? " · demo" : ""}
              </p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
