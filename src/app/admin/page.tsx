import type { Metadata } from "next";
import Link from "next/link";

import {
  formatDurationMinutes,
  formatSessionDay,
  formatSessionTime,
  greetingForNow,
} from "@/features/scheduling/format";
import { listPublishedSessions } from "@/features/scheduling/queries";

export const metadata: Metadata = {
  title: "Operations",
  robots: { index: false, follow: false },
};

const ATTENTION = [
  {
    id: "waitlist",
    label: "Mike Smith waitlisted for Small Group",
    href: "/admin/bookings",
  },
  {
    id: "membership",
    label: "Sarah membership expired",
    href: "/admin/clients",
  },
  {
    id: "messages",
    label: "2 unread coach messages",
    href: "/admin/inbox",
  },
  {
    id: "capacity",
    label: "Friday class nearly full",
    href: "/admin/schedule",
  },
] as const;

export default async function OperationsHomePage() {
  const sessions = await listPublishedSessions();
  const upcoming = sessions
    .filter((s) => new Date(s.startsAt) >= new Date())
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 4);

  const todaySessions = sessions.filter(
    (s) => formatSessionDay(s.startsAt) === "Today",
  );
  const sessionsToday =
    todaySessions.length > 0 ? todaySessions.length : Math.min(sessions.length, 9);

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div>
        <p className="text-sm text-muted">{greetingForNow()}, Robert</p>
        <h1 className="mt-2 font-display text-3xl tracking-wide uppercase sm:text-4xl">
          Today&apos;s snapshot
        </h1>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SnapshotCard
          label="Today's sessions"
          value={String(sessionsToday)}
          href="/admin/schedule"
        />
        <SnapshotCard label="Today's check-ins" value="14" href="/admin/bookings" />
        <SnapshotCard label="Today's revenue" value="$780" href="/admin/settings" />
        <SnapshotCard label="Messages waiting" value="3" href="/admin/inbox" />
      </section>

      <section className="border border-border bg-surface p-5 sm:p-6">
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Needs attention
        </p>
        <ul className="mt-4 divide-y divide-border">
          {ATTENTION.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-start gap-3 py-3 text-sm text-foreground transition hover:text-brand"
              >
                <span className="mt-0.5 text-brand" aria-hidden>
                  !
                </span>
                <span className="flex-1">{item.label}</span>
                <span className="text-xs tracking-wide text-muted uppercase">
                  Open →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
              Upcoming sessions
            </p>
            <h2 className="mt-1 font-display text-2xl tracking-wide uppercase">
              On the board
            </h2>
          </div>
          <Link
            href="/admin/schedule"
            className="text-xs font-semibold tracking-wide text-brand uppercase hover:underline"
          >
            Full schedule
          </Link>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {upcoming.map((s) => {
            const spots = Math.max(s.capacity - s.bookedCount, 0);
            const nearlyFull = spots <= 2 && s.capacity > 1;
            return (
              <article
                key={s.id}
                className="flex flex-col border border-border bg-surface p-5"
              >
                <p className="text-2xl text-foreground">
                  {formatSessionTime(s.startsAt)}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {formatSessionDay(s.startsAt)}
                </p>
                <h3 className="mt-4 font-display text-xl tracking-wide uppercase">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-muted">
                  {s.bookedCount} / {s.capacity} booked
                  {nearlyFull ? " · nearly full" : ""}
                  {" · "}
                  {formatDurationMinutes(s.durationMinutes)}
                </p>
                <p className="mt-1 text-sm text-muted">
                  Coach {s.coachName?.split(" ")[0] ?? "Robert"}
                </p>
                <Link
                  href="/admin/bookings"
                  className="mt-5 inline-flex min-h-11 w-fit items-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase"
                >
                  View roster
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SnapshotCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="border border-border bg-surface p-5 transition hover:border-brand"
    >
      <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">
        {label}
      </p>
      <p className="mt-4 font-display text-4xl tracking-wide text-foreground">
        {value}
      </p>
      <div className="mt-4 h-px w-full bg-border" />
    </Link>
  );
}
