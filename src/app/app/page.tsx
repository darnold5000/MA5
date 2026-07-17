import type { Metadata } from "next";
import Link from "next/link";

import { readDemoBookings } from "@/features/booking/demo-store";
import { getClientTrainingProgress } from "@/features/programs/queries";
import {
  formatCalendarDate,
  formatDurationMinutes,
  formatSessionDay,
  formatSessionTime,
  greetingForNow,
  toSessionDayKey,
} from "@/features/scheduling/format";
import {
  listPublishedSessions,
  listUserBookings,
} from "@/features/scheduling/queries";
import { demoClient, resolveClientFirstName } from "@/content/demo-persona";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { getActiveMembershipForUser } from "@/lib/stripe/sync-membership";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Home",
  robots: { index: false, follow: false },
};

function Chip({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "brand";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase",
        tone === "success" &&
          "border-emerald-700/40 bg-emerald-950/30 text-emerald-400",
        tone === "brand" && "border-brand/40 text-brand",
        tone === "default" && "border-border text-muted",
      )}
    >
      {children}
    </span>
  );
}

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

  const todayKey = toSessionDayKey(new Date().toISOString());
  const todayBooking =
    bookings.find(
      (b) => b.startsAt && toSessionDayKey(b.startsAt) === todayKey,
    ) ?? null;
  const nextBooking =
    bookings.find((b) => b.startsAt && new Date(b.startsAt) >= new Date()) ??
    null;

  const published = await listPublishedSessions();
  const suggested =
    published
      .filter((s) => new Date(s.startsAt) >= new Date() && s.status !== "full")
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0] ?? null;

  const focusBooking = todayBooking ?? nextBooking;
  const heroSession = focusBooking
    ? published.find((s) => s.id === focusBooking.sessionId) ?? null
    : suggested;

  const activeMembership = session
    ? await getActiveMembershipForUser(session.id)
    : null;

  const firstName = resolveClientFirstName({
    email: session?.email ?? session?.profile?.email,
    fullName: session?.profile?.full_name,
  });

  const used =
    demoClient.membership.sessionsIncluded -
    demoClient.membership.sessionsRemaining;
  const included = demoClient.membership.sessionsIncluded;
  const progressPct = Math.round((used / included) * 100);
  const streakWeeks = demoClient.membership.streakWeeks;

  const isWorkoutDay = Boolean(todayBooking);
  const hasUpcoming = Boolean(nextBooking);
  const heroIsBooked = Boolean(focusBooking);
  const heroTitle =
    focusBooking?.sessionTitle ?? suggested?.title ?? null;
  const heroStarts = focusBooking?.startsAt ?? suggested?.startsAt ?? null;
  const spotsLeft = heroSession
    ? Math.max(heroSession.capacity - heroSession.bookedCount, 0)
    : null;
  const coachFirst =
    heroSession?.coachName?.split(" ")[0] ?? "Robert";
  const paymentStatus = focusBooking?.paymentStatus ?? null;

  let contextEyebrow = "Next workout";
  let contextTitle = heroTitle;
  let contextSupport: string | null = null;

  if (isWorkoutDay && heroTitle) {
    contextEyebrow = "Today's workout";
  } else if (!hasUpcoming && !suggested) {
    contextEyebrow = "Nothing scheduled";
    contextTitle = "Reserve your next session";
    contextSupport = "Pick a time that fits and claim your spot.";
  } else if (!hasUpcoming && suggested) {
    contextEyebrow = "Recovery day";
    contextSupport = "Nothing on your calendar — take it easy, or reserve ahead.";
  } else if (!isWorkoutDay && hasUpcoming) {
    contextEyebrow = "Next workout";
  }

  const trainingProgress = session
    ? await getClientTrainingProgress(
        session.id,
        session.email ?? session.profile?.email,
      )
    : await getClientTrainingProgress("client-alex", demoClient.email);

  const hasProgramWorkout = Boolean(trainingProgress.todayWorkout);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
            Fitness Hub
          </p>
          <h1 className="mt-2 font-display text-3xl tracking-wide uppercase sm:text-4xl">
            {greetingForNow()}, {firstName}
          </h1>
          <p className="mt-2 text-sm text-muted">{formatCalendarDate()}</p>
          <p className="mt-3 text-sm text-foreground">
            {used} of {included} sessions used this month
            <span className="text-muted"> · </span>
            {streakWeeks} week training streak
          </p>
        </div>
      </div>

      <section className="border border-border bg-surface p-6 sm:p-10">
        <p className="text-xs font-semibold tracking-[0.25em] text-brand uppercase">
          {contextEyebrow}
        </p>
        {heroTitle && heroStarts && (hasUpcoming || Boolean(suggested)) ? (
          <>
            <h2 className="mt-4 font-display text-4xl tracking-wide uppercase sm:text-5xl">
              {heroTitle}
            </h2>
            {!hasUpcoming && contextSupport ? (
              <p className="mt-3 text-sm text-muted">{contextSupport}</p>
            ) : null}
            <p className="mt-6 text-xl text-foreground sm:text-2xl">
              {formatSessionDay(heroStarts)}
              <span className="text-muted"> · </span>
              {formatSessionTime(heroStarts)}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Chip tone="brand">{formatSessionDay(heroStarts)}</Chip>
              <Chip>Coach {coachFirst}</Chip>
              {heroSession ? (
                <Chip>{formatDurationMinutes(heroSession.durationMinutes)}</Chip>
              ) : null}
              {heroIsBooked ? (
                <>
                  <Chip tone="success">Confirmed</Chip>
                  {paymentStatus === "paid" ? (
                    <Chip tone="success">Paid</Chip>
                  ) : paymentStatus === "pay_at_facility" ? (
                    <Chip>Pay at facility</Chip>
                  ) : null}
                </>
              ) : spotsLeft != null ? (
                <Chip>
                  {spotsLeft === 0
                    ? "Full"
                    : `${spotsLeft} spots remaining`}
                </Chip>
              ) : null}
            </div>
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
            <h2 className="mt-4 font-display text-4xl tracking-wide uppercase sm:text-5xl">
              {contextTitle ?? "Ready to train?"}
            </h2>
            <p className="mt-4 text-sm text-muted">
              {contextSupport ?? "Pick a session and reserve your spot."}
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
        <p className="mt-1 text-sm text-muted">
          {streakWeeks} week streak
          {activeMembership ? ` · ${activeMembership.productName}` : ""}
        </p>
      </section>

      <section className="border-b border-border pb-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Program
        </p>
        {trainingProgress.programTitle ? (
          <>
            <h2 className="mt-2 font-display text-3xl tracking-wide uppercase">
              {hasProgramWorkout
                ? trainingProgress.todayWorkout!.title
                : trainingProgress.programTitle}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {trainingProgress.programTitle}
              {trainingProgress.weekLabel
                ? ` · ${trainingProgress.weekLabel}`
                : ""}
            </p>
            <p className="mt-1 text-sm text-foreground">
              {trainingProgress.completedCount} / {trainingProgress.totalCount}{" "}
              workouts complete
              <span className="text-muted">
                {" "}
                · {trainingProgress.progressPercent}%
              </span>
            </p>
            <Link
              href={
                hasProgramWorkout
                  ? `/app/programs/workouts/${trainingProgress.todayWorkout!.entryId}`
                  : "/app/programs"
              }
              className="mt-5 inline-flex text-xs font-semibold tracking-wide text-brand uppercase hover:underline"
            >
              {hasProgramWorkout ? "Open workout →" : "Open program →"}
            </Link>
          </>
        ) : (
          <>
            <h2 className="mt-2 font-display text-3xl tracking-wide uppercase">
              No program yet
            </h2>
            <p className="mt-2 text-sm text-muted">
              Your coach will assign training here.
            </p>
            <Link
              href="/app/programs"
              className="mt-5 inline-flex text-xs font-semibold tracking-wide text-brand uppercase hover:underline"
            >
              Open programs →
            </Link>
          </>
        )}
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
          href="/app/messages"
          className="mt-5 inline-flex text-xs font-semibold tracking-wide text-brand uppercase hover:underline"
        >
          Reply to Coach
        </Link>
      </section>
    </div>
  );
}
