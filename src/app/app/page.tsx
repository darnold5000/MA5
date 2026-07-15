import type { Metadata } from "next";
import Link from "next/link";

import { readDemoBookings } from "@/features/booking/demo-store";
import { paymentStatusLabel } from "@/features/booking/labels";
import {
  formatMoney,
  formatSessionWhen,
} from "@/features/scheduling/format";
import { listUserBookings } from "@/features/scheduling/queries";
import { demoClient } from "@/content/demo-persona";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Overview",
  robots: { index: false, follow: false },
};

export default async function ClientDashboardPage() {
  const configured = isSupabasePublicConfigured();
  const session = configured ? await getSessionUser() : null;
  const demoBookings = await readDemoBookings();
  const dbBookings = configured
    ? await listUserBookings(session?.id ?? null)
    : [];
  const bookings = [...demoBookings, ...dbBookings.filter((b) => b.source === "database")]
    .sort((a, b) => (a.startsAt || "").localeCompare(b.startsAt || ""));

  const next = bookings.find((b) => b.startsAt && new Date(b.startsAt) >= new Date())
    ?? bookings[0]
    ?? null;

  const firstName =
    session?.profile?.full_name?.split(" ")[0] ?? demoClient.firstName;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Overview
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase sm:text-4xl">
          Welcome back, {firstName}
        </h1>
      </div>

      <section className="border border-border bg-surface p-6">
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Your next session
        </p>
        {next ? (
          <>
            <h2 className="mt-2 font-display text-2xl tracking-wide uppercase">
              {next.sessionTitle}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {next.startsAt ? formatSessionWhen(next.startsAt) : "Time TBD"}
              {" · "}
              Coach Robert Anderson
              {" · "}
              {paymentStatusLabel(
                next.amountCents === 0 ? "included" : next.paymentStatus,
              )}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/app/bookings"
                className="inline-flex min-h-11 items-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase"
              >
                View details
              </Link>
              <Link
                href="/app/bookings"
                className="inline-flex min-h-11 items-center border border-border px-5 text-xs font-semibold tracking-wide uppercase"
              >
                Cancel booking
              </Link>
              <Link
                href="/app/schedule"
                className="inline-flex min-h-11 items-center border border-border px-5 text-xs font-semibold tracking-wide uppercase"
              >
                Book another session
              </Link>
            </div>
          </>
        ) : (
          <>
            <h2 className="mt-2 font-display text-2xl tracking-wide uppercase">
              No upcoming sessions
            </h2>
            <p className="mt-2 text-sm text-muted">
              Reserve your next training session from the schedule.
            </p>
            <div className="mt-5">
              <Link
                href="/app/schedule"
                className="inline-flex min-h-11 items-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase"
              >
                Book a session
              </Link>
            </div>
          </>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <section className="border border-border bg-surface p-5">
          <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
            Membership
          </p>
          <h2 className="mt-2 font-display text-xl tracking-wide uppercase">
            {demoClient.membership.name}
          </h2>
          <p className="mt-3 text-sm text-muted">
            {demoClient.membership.sessionsRemaining} of{" "}
            {demoClient.membership.sessionsIncluded} sessions remaining
          </p>
          <p className="mt-1 text-sm text-muted">
            Renews {demoClient.membership.renewsOn} ·{" "}
            {demoClient.membership.status}
          </p>
          <Link
            href="/app/billing"
            className="mt-4 inline-flex text-xs font-semibold tracking-wide text-brand uppercase hover:underline"
          >
            Manage membership
          </Link>
        </section>

        <section className="border border-border bg-surface p-5">
          <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
            Program progress
          </p>
          <h2 className="mt-2 font-display text-xl tracking-wide uppercase">
            {demoClient.programProgress.name}
          </h2>
          <div className="mt-4 h-2 w-full bg-background">
            <div
              className="h-2 bg-brand"
              style={{ width: `${demoClient.programProgress.percent}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-muted">
            {demoClient.programProgress.percent}% complete
          </p>
          <Link
            href="/app/programs"
            className="mt-4 inline-flex text-xs font-semibold tracking-wide text-brand uppercase hover:underline"
          >
            View program
          </Link>
        </section>

        <section className="border border-border bg-surface p-5 md:col-span-2 xl:col-span-1">
          <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
            Message from coach
          </p>
          <h2 className="mt-2 font-display text-xl tracking-wide uppercase">
            {demoClient.coachMessage.from}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {demoClient.coachMessage.preview}
          </p>
          <Link
            href="/app/messages"
            className="mt-4 inline-flex text-xs font-semibold tracking-wide text-brand uppercase hover:underline"
          >
            Open messages
          </Link>
        </section>
      </div>

      <section className="border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl tracking-wide uppercase">
            Upcoming bookings
          </h2>
          <Link
            href="/app/schedule"
            className="text-xs font-semibold tracking-wide text-brand uppercase hover:underline"
          >
            Quick book
          </Link>
        </div>
        {bookings.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Nothing scheduled yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {bookings.slice(0, 4).map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <span className="text-foreground">{b.sessionTitle}</span>
                <span className="text-muted">
                  {b.startsAt ? formatSessionWhen(b.startsAt) : "TBD"}
                  {b.amountCents > 0 ? ` · ${formatMoney(b.amountCents)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
