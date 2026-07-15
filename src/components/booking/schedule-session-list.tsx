"use client";

import { useState } from "react";

import { BookSessionButton } from "@/components/booking/book-session-button";
import type { SessionItem } from "@/features/scheduling/fallback-data";
import { cn } from "@/lib/utils";

type ScheduleSessionListProps = {
  sessions: SessionItem[];
  formatWhen: (iso: string) => string;
  formatMoney: (cents: number) => string;
};

export function ScheduleSessionList({
  sessions,
  formatWhen,
  formatMoney,
}: ScheduleSessionListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {sessions.map((session) => {
        const spots = Math.max(session.capacity - session.bookedCount, 0);
        const full = spots <= 0 || session.status === "full";
        const open = expandedId === session.id;

        return (
          <article
            key={session.id}
            className={cn(
              "border bg-surface p-5 transition",
              open ? "border-brand" : "border-border",
            )}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
                  {formatWhen(session.startsAt)}
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
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() =>
                    setExpandedId((current) =>
                      current === session.id ? null : session.id,
                    )
                  }
                  className="text-xs text-muted transition hover:text-foreground"
                >
                  {open ? "Hide details" : "Details"}
                </button>
              </div>
            </div>

            {open ? (
              <div className="mt-5 border-t border-border pt-5">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs tracking-wide text-muted uppercase">
                      Coach
                    </dt>
                    <dd className="mt-1 text-foreground">{session.coachName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs tracking-wide text-muted uppercase">
                      Location
                    </dt>
                    <dd className="mt-1 text-foreground">
                      {session.locationName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs tracking-wide text-muted uppercase">
                      Capacity
                    </dt>
                    <dd className="mt-1 text-foreground">
                      {full
                        ? "Full"
                        : `${spots} of ${session.capacity} open`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs tracking-wide text-muted uppercase">
                      Price
                    </dt>
                    <dd className="mt-1 text-foreground">
                      {session.priceCents > 0
                        ? formatMoney(session.priceCents)
                        : "Included / inquire"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs tracking-wide text-muted uppercase">
                      About this session
                    </dt>
                    <dd className="mt-1 leading-relaxed text-muted">
                      {session.description}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
