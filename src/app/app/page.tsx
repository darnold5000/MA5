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

  const activeMembership = session
    ? await getActiveMembershipForUser(session.id)
    : null;

  const firstName =
    session?.profile?.full_name?.split(" ")[0] ?? demoClient.firstName;

  const heroTitle = nextBooking?.sessionTitle ?? suggested?.title ?? null;
  const heroStarts = nextBooking?.startsAt ?? suggested?.startsAt ?? null;
  const heroIsBooked = Boolean(nextBooking);

  return (
    <div className="space-y-8">
      <section className="border border-border bg-surface p-6 sm:p-8">
        <p className="text-sm text-muted">
          {greetingForNow()}, {firstName}
        </p>
        <p className="mt-4 text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          {heroIsBooked ? "Next workout" : "Up next"}
        </p>
        {heroTitle && heroStarts ? (
          <>
            <h1 className="mt-2 font-display text-3xl tracking-wide uppercase sm:text-4xl">
              {heroTitle}
            </h1>
            <p className="mt-4 text-lg text-foreground">
              {formatSessionDay(heroStarts)}
            </p>
            <p className="mt-1 text-2xl text-foreground">
              {formatSessionTime(heroStarts)}
            </p>
            <p className="mt-3 text-sm text-muted">Coach Robert</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={heroIsBooked ? "/app/bookings" : "/app/schedule"}
                className="inline-flex min-h-11 items-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase"
              >
                {heroIsBooked ? "View details" : "Reserve spot"}
              </Link>
              {!heroIsBooked ? (
                <Link
                  href="/app/schedule"
                  className="inline-flex min-h-11 items-center border border-border px-5 text-xs font-semibold tracking-wide uppercase"
                >
                  See all sessions
                </Link>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-2 font-display text-3xl tracking-wide uppercase sm:text-4xl">
              Ready to train?
            </h1>
            <p className="mt-3 text-sm text-muted">
              Pick a session and reserve your spot.
            </p>
            <Link
              href="/app/schedule"
              className="mt-6 inline-flex min-h-11 items-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase"
            >
              Reserve a session
            </Link>
          </>
        )}
      </section>

      <section className="border-y border-border py-6">
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Plan
        </p>
        <h2 className="mt-2 font-display text-2xl tracking-wide uppercase">
          {activeMembership?.productName ?? demoClient.membership.name}
        </h2>
        <p className="mt-3 text-sm text-muted">
          {demoClient.membership.sessionsRemaining} /{" "}
          {demoClient.membership.sessionsIncluded} sessions remaining
        </p>
        <Link
          href="/app/billing"
          className="mt-4 inline-flex text-xs font-semibold tracking-wide text-brand uppercase hover:underline"
        >
          Manage plan
        </Link>
      </section>

      <section className="border-b border-border pb-6">
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Current program
        </p>
        <h2 className="mt-2 font-display text-2xl tracking-wide uppercase">
          {demoClient.programProgress.name}
        </h2>
        <p className="mt-2 text-sm text-muted">Week 4</p>
        <div className="mt-4 h-2 w-full max-w-md bg-background">
          <div
            className="h-2 bg-brand"
            style={{ width: `${demoClient.programProgress.percent}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-muted">
          {demoClient.programProgress.percent}%
        </p>
        <Link
          href="/app/programs"
          className="mt-4 inline-flex text-xs font-semibold tracking-wide text-brand uppercase hover:underline"
        >
          Open program
        </Link>
      </section>

      <section className="pb-2">
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Coach message
        </p>
        <p className="mt-3 text-base leading-relaxed text-foreground">
          “{demoClient.coachMessage.preview}”
        </p>
        <p className="mt-2 text-sm text-muted">
          — {demoClient.coachMessage.from}
        </p>
        <Link
          href="/app/inbox"
          className="mt-4 inline-flex text-xs font-semibold tracking-wide text-brand uppercase hover:underline"
        >
          Reply
        </Link>
      </section>
    </div>
  );
}
