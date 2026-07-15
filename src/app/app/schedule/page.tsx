import type { Metadata } from "next";
import Link from "next/link";

import { BookSessionButton } from "@/components/booking/book-session-button";
import { StatusBanner } from "@/components/platform/status-banner";
import {
  formatMoney,
  formatSessionWhen,
  listPublishedSessions,
} from "@/features/scheduling/queries";

export const metadata: Metadata = {
  title: "Schedule",
  robots: { index: false, follow: false },
};

export default async function SchedulePage() {
  const sessions = await listPublishedSessions();
  const usingDemo = sessions.every((s) => s.source === "demo");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl tracking-wide uppercase">
          Upcoming sessions
        </h2>
        <p className="mt-2 text-sm text-muted">
          Native MA5 schedule — assessments, small group, sports performance,
          InBody, and sauna.
        </p>
      </div>

      {usingDemo ? (
        <StatusBanner tone="warning" title="Demo schedule">
          Showing sample sessions so you can evaluate booking UX before Supabase
          is connected.
        </StatusBanner>
      ) : null}

      <div className="space-y-3">
        {sessions.map((session) => {
          const spots = Math.max(session.capacity - session.bookedCount, 0);
          const full = spots <= 0 || session.status === "full";
          return (
            <article
              key={session.id}
              className="flex flex-col gap-4 border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
                  {formatSessionWhen(session.startsAt)}
                </p>
                <h3 className="mt-1 font-display text-xl tracking-wide uppercase">
                  {session.title}
                </h3>
                <p className="mt-1 text-sm text-muted">{session.description}</p>
                <p className="mt-2 text-xs text-muted">
                  {session.coachName} · {session.locationName} ·{" "}
                  {full ? "Full" : `${spots} spots left`} ·{" "}
                  {session.priceCents > 0
                    ? formatMoney(session.priceCents)
                    : "Included / inquire"}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                <BookSessionButton sessionId={session.id} disabled={full} />
                <Link
                  href={`/app/schedule/${session.id}`}
                  className="text-xs text-muted hover:text-foreground"
                >
                  Details
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
