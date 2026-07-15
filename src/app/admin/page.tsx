import type { Metadata } from "next";
import Link from "next/link";

import {
  formatMoney,
  formatSessionWhen,
  listPublishedSessions,
  listProducts,
} from "@/features/scheduling/queries";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminOverviewPage() {
  const [sessions, products] = await Promise.all([
    listPublishedSessions(),
    listProducts(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Operations
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase">
          Today at MA5
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="border border-border bg-surface p-5">
          <p className="text-xs tracking-wide text-muted uppercase">
            Sessions live
          </p>
          <p className="mt-2 font-display text-3xl">{sessions.length}</p>
        </div>
        <div className="border border-border bg-surface p-5">
          <p className="text-xs tracking-wide text-muted uppercase">Products</p>
          <p className="mt-2 font-display text-3xl">{products.length}</p>
        </div>
        <div className="border border-border bg-surface p-5">
          <p className="text-xs tracking-wide text-muted uppercase">
            Open capacity
          </p>
          <p className="mt-2 font-display text-3xl">
            {sessions.reduce(
              (sum, s) => sum + Math.max(s.capacity - s.bookedCount, 0),
              0,
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/schedule"
          className="inline-flex min-h-11 items-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase"
        >
          Manage schedule
        </Link>
        <Link
          href="/admin/bookings"
          className="inline-flex min-h-11 items-center border border-border px-5 text-xs font-semibold tracking-wide uppercase"
        >
          Check-in roster
        </Link>
        <Link
          href="/admin/products"
          className="inline-flex min-h-11 items-center border border-border px-5 text-xs font-semibold tracking-wide uppercase"
        >
          Products
        </Link>
      </div>

      <section className="border border-border bg-surface p-5">
        <h2 className="font-display text-xl tracking-wide uppercase">
          Next up
        </h2>
        <ul className="mt-4 space-y-2 text-sm text-muted">
          {sessions.slice(0, 5).map((s) => (
            <li key={s.id}>
              {formatSessionWhen(s.startsAt)} — {s.title}
              {s.priceCents > 0 ? ` (${formatMoney(s.priceCents)})` : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
