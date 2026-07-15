import type { Metadata } from "next";
import Link from "next/link";

import { StatusBanner } from "@/components/platform/status-banner";
import {
  formatMoney,
  formatSessionWhen,
  listPublishedSessions,
  listProducts,
} from "@/features/scheduling/queries";
import { FALLBACK_BOOKINGS } from "@/features/scheduling/fallback-data";

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
      <StatusBanner title="Staff overview">
        Demo admin tools for schedule, bookings, and membership products. Full
        CRUD editors can deepen after this flow is approved.
      </StatusBanner>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="border border-border bg-surface p-5">
          <p className="text-xs tracking-wide text-muted uppercase">Sessions</p>
          <p className="mt-2 font-display text-3xl">{sessions.length}</p>
        </div>
        <div className="border border-border bg-surface p-5">
          <p className="text-xs tracking-wide text-muted uppercase">Products</p>
          <p className="mt-2 font-display text-3xl">{products.length}</p>
        </div>
        <div className="border border-border bg-surface p-5">
          <p className="text-xs tracking-wide text-muted uppercase">
            Demo bookings
          </p>
          <p className="mt-2 font-display text-3xl">{FALLBACK_BOOKINGS.length}</p>
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
          href="/admin/products"
          className="inline-flex min-h-11 items-center border border-border px-5 text-xs font-semibold tracking-wide uppercase"
        >
          Products
        </Link>
        <Link
          href="/admin/bookings"
          className="inline-flex min-h-11 items-center border border-border px-5 text-xs font-semibold tracking-wide uppercase"
        >
          Bookings
        </Link>
      </div>

      <section className="border border-border bg-surface p-5">
        <h2 className="font-display text-xl tracking-wide uppercase">
          Next up on the schedule
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
