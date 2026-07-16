import type { Metadata } from "next";
import Link from "next/link";

import { readDemoBookings } from "@/features/booking/demo-store";
import {
  formatSessionDay,
  formatSessionTime,
  greetingForNow,
} from "@/features/scheduling/format";
import {
  listPublishedSessions,
  listUserBookings,
} from "@/features/scheduling/queries";
import { demoClient } from "@/content/demo-persona";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { getActiveMembershipForUser } from "@/lib/stripe/sync-membership";

export const metadata: Metadata = {
  title: "Home",
  robots: { index: false, follow: false },
};

export default async function ClientDashboardPage() {
  const configured = isSupabasePublicConfigured();
  const session = configured ? await getSessionUser() : null;
  const demoBookings = await readDemoBookings();
  const dbBookings = configured
    ? await listUserBookings(session?.id ?? null)
    : [];
  const bookings = [
    ...demoBookings,
    ...dbBookings.filter((b) => b.source === "database"),
  ]
    .filter((b) => b.status !== "cancelled" && b.status !== "refunded")
    .sort((a, b) => (a.startsAt || "").localeCompare(b.startsAt || ""));

  const nextBooking =
    bookings.find((b) => b.startsAt && new Date(b.startsAt) >= new Date()) ??
    null;

  const published = await listPublishedSessions();
  const suggested =
    published
      .filter((s) => new Date(s.startsAt) >= new Date() && s.status !== "full")
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0] ?? null;

  const heroSession = nextBooking
    ? published.find((s) => s.id === nextBooking.sessionId) ?? null
    : suggested;

  const activeMembership = session
    ? await getActiveMembershipForUser(session.id)
    : null;

  const firstName =
    session?.profile?.full_name?.split(" ")[0] ?? demoClient.firstName;

  const heroTitle = nextBooking?.sessionTitle ?? suggested?.title ?? null;
  const heroStarts = nextBooking?.startsAt ?? suggested?.startsAt ?? null;
  const heroIsBooked = Boolean(nextBooking);
  const spotsLeft = heroSession
    ? Math.max(heroSession.capacity - heroSession.bookedCount, 0)
    : null;

  const used =
    demoClient.membership.sessionsIncluded -
    demoClient.membership.sessionsRemaining;
  const included = demoClient.membership.sessionsIncluded;
  const progressPct = Math.round((used / included) * 100);

  return (
    <div className="space-y-10">
      <p className="text-sm text-muted">
        {greetingForNow()}, {firstName}
      </p>

      <section className="border border-border bg-surface p-6 sm:p-10">
        <p className="text-xs font-semibold tracking-[0.25em] text-brand uppercase">
          Next workout
        </p>
        {heroTitle && heroStarts ? (
          <>
            <h1 className="mt-4 font-display text-4xl tracking-wide uppercase sm:text-5xl">
              {heroTitle}
            </h1>
            <p className="mt-6 text-xl text-foreground sm:text-2xl">
              {formatSessionDay(heroStarts)}
              <span className="text-muted"> · </span>
              {formatSessionTime(heroStarts)}
            </p>
            <p className="mt-4 text-base text-muted">Coach Robert</p>
            {spotsLeft != null && !heroIsBooked ? (
              <p className="mt-2 text-sm text-muted">
                {spotsLeft} spots remaining
              </p>
            ) : null}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={heroIsBooked ? "/app/bookings" : "/app/schedule"}
                className="inline-flex min-h-12 items-center bg-brand px-6 text-xs font-semibold tracking-wide text-brand-foreground uppercase"
              >
                {heroIsBooked ? "View details" : "Reserve spot"}
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-4 font-display text-4xl tracking-wide uppercase sm:text-5xl">
              Ready to train?
            </h1>
            <p className="mt-4 text-sm text-muted">
              Pick a session and reserve your spot.
            </p>
            <Link
              href="/app/schedule"
              className="mt-8 inline-flex min-h-12 items-center bg-brand px-6 text-xs font-semibold tracking-wide text-brand-foreground uppercase"
            >
              Reserve a session
            </Link>
          </>
        )}
      </section>

      <section className="border-y border-border py-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          This month
        </p>
        <div className="mt-4 h-2.5 w-full max-w-lg bg-background">
          <div className="h-2.5 bg-brand" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="mt-3 text-sm text-foreground">
          {used} / {included} sessions used
        </p>
        <p className="mt-1 text-sm text-muted">2 week streak</p>
        {activeMembership ? (
          <p className="mt-3 text-xs text-muted">
            Plan · {activeMembership.productName}
          </p>
        ) : null}
      </section>

      <section className="border-b border-border pb-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Today&apos;s workout
        </p>
        <h2 className="mt-2 font-display text-3xl tracking-wide uppercase">
          Upper Body
        </h2>
        <p className="mt-2 text-sm text-muted">45 min · {demoClient.programProgress.name}</p>
        <Link
          href="/app/programs"
          className="mt-5 inline-flex text-xs font-semibold tracking-wide text-brand uppercase hover:underline"
        >
          Open workout →
        </Link>
      </section>

      <section className="pb-2">
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Coach message
        </p>
        <p className="mt-3 text-base leading-relaxed text-foreground sm:text-lg">
          “{demoClient.coachMessage.preview}”
        </p>
        <p className="mt-2 text-sm text-muted">
          — {demoClient.coachMessage.from}
        </p>
        <Link
          href="/app/inbox"
          className="mt-5 inline-flex text-xs font-semibold tracking-wide text-brand uppercase hover:underline"
        >
          Reply to Coach
        </Link>
      </section>
    </div>
  );
}
