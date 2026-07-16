"use client";

import Link from "next/link";

import {
  formatSessionDay,
  formatSessionTime,
} from "@/features/scheduling/format";

type BookingCelebrationProps = {
  title: string;
  startsAt?: string | null;
  paid?: boolean;
};

export function BookingCelebration({
  title,
  startsAt,
  paid = false,
}: BookingCelebrationProps) {
  return (
    <div
      className="border border-border bg-surface px-4 py-4"
      role="status"
      aria-live="polite"
    >
      <p className="text-[10px] font-semibold tracking-[0.2em] text-muted uppercase">
        {paid ? "Payment complete" : "You’re booked"}
      </p>
      <h2 className="mt-1.5 font-display text-xl tracking-wide uppercase">
        {title}
      </h2>
      {startsAt ? (
        <p className="mt-2 text-sm text-foreground">
          {formatSessionDay(startsAt)}
          <span className="text-muted"> · </span>
          {formatSessionTime(startsAt)}
        </p>
      ) : null}
      <p className="mt-1 text-xs text-muted">
        Coach Robert · Added to your schedule
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/app/schedule"
          className="inline-flex min-h-9 items-center border border-border px-3 text-[11px] font-semibold tracking-wide uppercase"
        >
          Reserve another
        </Link>
      </div>
    </div>
  );
}
