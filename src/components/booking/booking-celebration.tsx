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
      className="border border-brand bg-brand/10 px-5 py-6"
      role="status"
      aria-live="polite"
    >
      <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
        {paid ? "Payment complete" : "You’re booked"}
      </p>
      <h2 className="mt-2 font-display text-2xl tracking-wide uppercase">
        {title}
      </h2>
      {startsAt ? (
        <>
          <p className="mt-3 text-base text-foreground">
            {formatSessionDay(startsAt)}
          </p>
          <p className="mt-1 text-xl text-foreground">
            {formatSessionTime(startsAt)}
          </p>
        </>
      ) : null}
      <p className="mt-3 text-sm text-muted">Coach Robert</p>
      <p className="mt-2 text-sm text-muted">Added to your training schedule.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/app/bookings"
          className="inline-flex min-h-11 items-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase"
        >
          View my training
        </Link>
        <Link
          href="/app/schedule"
          className="inline-flex min-h-11 items-center border border-border px-4 text-xs font-semibold tracking-wide uppercase"
        >
          Reserve another
        </Link>
      </div>
    </div>
  );
}
