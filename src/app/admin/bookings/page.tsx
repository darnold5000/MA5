import type { Metadata } from "next";

import { FALLBACK_BOOKINGS } from "@/features/scheduling/fallback-data";
import {
  formatMoney,
  formatSessionWhen,
} from "@/features/scheduling/queries";

export const metadata: Metadata = {
  title: "Admin bookings",
  robots: { index: false, follow: false },
};

export default function AdminBookingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl tracking-wide uppercase">
          Bookings
        </h2>
        <p className="mt-2 text-sm text-muted">
          Roster / check-in view. Demo bookings shown until the database is
          connected.
        </p>
      </div>
      <div className="space-y-3">
        {FALLBACK_BOOKINGS.map((b) => (
          <article key={b.id} className="border border-border bg-surface p-5">
            <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
              {b.confirmationNumber}
            </p>
            <h3 className="mt-1 font-display text-xl uppercase">
              {b.sessionTitle}
            </h3>
            <p className="mt-2 text-sm text-muted">
              {formatSessionWhen(b.startsAt)} · {b.status} · {b.paymentStatus}
              {b.amountCents > 0 ? ` · ${formatMoney(b.amountCents)}` : ""}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
