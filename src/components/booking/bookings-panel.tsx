"use client";

import { useMemo, useState } from "react";

import type { BookingItem } from "@/features/scheduling/fallback-data";
import {
  formatMoney,
  formatMonthLabel,
  formatSessionWhen,
  toSessionDayKey,
} from "@/features/scheduling/format";
import { cn } from "@/lib/utils";

type BookingsPanelProps = {
  bookings: BookingItem[];
  justBookedConfirmation?: string;
};

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

function startOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1);
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function BookingsPanel({
  bookings,
  justBookedConfirmation,
}: BookingsPanelProps) {
  const ordered = useMemo(
    () =>
      [...bookings].sort((a, b) =>
        (a.startsAt || "").localeCompare(b.startsAt || ""),
      ),
    [bookings],
  );

  const bookedDays = useMemo(() => {
    const map = new Map<string, number>();
    for (const booking of ordered) {
      if (!booking.startsAt) continue;
      const key = toSessionDayKey(booking.startsAt);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [ordered]);

  const initialFocus = useMemo(() => {
    const first = ordered.find((b) => b.startsAt)?.startsAt;
    return first ? new Date(first) : new Date();
  }, [ordered]);

  const [cursor, setCursor] = useState(() => ({
    year: initialFocus.getFullYear(),
    month: initialFocus.getMonth(),
  }));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const visible = useMemo(() => {
    if (!selectedDay) return ordered;
    return ordered.filter(
      (b) => b.startsAt && toSessionDayKey(b.startsAt) === selectedDay,
    );
  }, [ordered, selectedDay]);

  const firstWeekday = startOfMonth(cursor.year, cursor.month).getDay();
  const totalDays = daysInMonth(cursor.year, cursor.month);
  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayKey = toSessionDayKey(new Date().toISOString());

  const clearDayFilter = () => setSelectedDay(null);

  const selectedLabel = selectedDay
    ? new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "America/Indiana/Indianapolis",
      }).format(new Date(`${selectedDay}T12:00:00`))
    : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-3">
        {selectedDay ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border border-brand bg-surface px-4 py-3">
            <p className="text-sm text-foreground">
              Filtered to{" "}
              <span className="font-semibold">{selectedLabel}</span>
            </p>
            <button
              type="button"
              onClick={clearDayFilter}
              className="inline-flex min-h-10 items-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase"
            >
              All bookings
            </button>
          </div>
        ) : null}

        {visible.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              {ordered.length === 0
                ? "No bookings yet. Pick a session from the schedule to reserve a spot."
                : "No bookings on this day."}
            </p>
            {selectedDay && ordered.length > 0 ? (
              <button
                type="button"
                onClick={clearDayFilter}
                className="inline-flex min-h-10 items-center border border-border px-4 text-xs font-semibold tracking-wide uppercase"
              >
                Back to all bookings
              </button>
            ) : null}
          </div>
        ) : (
          visible.map((booking) => {
            const isNew = justBookedConfirmation === booking.confirmationNumber;
            return (
              <article
                key={booking.id}
                id={`booking-${booking.confirmationNumber}`}
                className={
                  isNew
                    ? "border border-brand bg-surface p-5"
                    : "border border-border bg-surface p-5"
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
                    {booking.confirmationNumber}
                  </p>
                  {isNew ? (
                    <span className="text-[10px] font-semibold tracking-wide text-brand uppercase">
                      Just booked
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-1 font-display text-xl tracking-wide uppercase">
                  {booking.sessionTitle}
                </h3>
                <p className="mt-2 text-sm text-muted">
                  {booking.startsAt
                    ? formatSessionWhen(booking.startsAt)
                    : "Time TBD"}{" "}
                  · {booking.status}
                  {booking.paymentStatus === "pay_at_facility"
                    ? " · pay at facility"
                    : ` · ${booking.paymentStatus}`}
                  {booking.amountCents > 0
                    ? ` · ${formatMoney(booking.amountCents)}`
                    : ""}
                </p>
              </article>
            );
          })
        )}
      </div>

      <aside className="border border-border bg-surface p-4 lg:sticky lg:top-24 lg:self-start">
        <button
          type="button"
          onClick={clearDayFilter}
          className={cn(
            "mb-4 inline-flex min-h-10 w-full items-center justify-center px-3 text-xs font-semibold tracking-wide uppercase transition",
            selectedDay
              ? "border border-border text-foreground hover:border-brand"
              : "bg-brand text-brand-foreground",
          )}
        >
          {selectedDay ? "Show all bookings" : "All bookings"}
        </button>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() =>
              setCursor((c) => {
                const d = new Date(c.year, c.month - 1, 1);
                return { year: d.getFullYear(), month: d.getMonth() };
              })
            }
            className="inline-flex h-9 w-9 items-center justify-center border border-border text-sm text-muted hover:border-brand hover:text-foreground"
          >
            ‹
          </button>
          <p className="font-display text-sm tracking-wide uppercase">
            {formatMonthLabel(cursor.year, cursor.month)}
          </p>
          <button
            type="button"
            aria-label="Next month"
            onClick={() =>
              setCursor((c) => {
                const d = new Date(c.year, c.month + 1, 1);
                return { year: d.getFullYear(), month: d.getMonth() };
              })
            }
            className="inline-flex min-h-9 w-9 items-center justify-center border border-border text-sm text-muted hover:border-brand hover:text-foreground"
          >
            ›
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] tracking-wide text-muted uppercase">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((day, index) => {
            if (day == null) {
              return <div key={`empty-${index}`} className="h-9" />;
            }

            const key = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const count = bookedDays.get(key) ?? 0;
            const hasBooking = count > 0;
            const isSelected = selectedDay === key;
            const isToday = key === todayKey;

            return (
              <button
                key={key}
                type="button"
                disabled={!hasBooking}
                onClick={() =>
                  setSelectedDay((current) => (current === key ? null : key))
                }
                className={cn(
                  "relative flex h-9 flex-col items-center justify-center text-xs transition",
                  hasBooking
                    ? "text-foreground hover:bg-brand/15"
                    : "text-muted/50",
                  isSelected && "bg-brand text-brand-foreground hover:bg-brand",
                  !isSelected && isToday && "ring-1 ring-border",
                )}
                aria-label={
                  hasBooking
                    ? `${key}, ${count} booking${count === 1 ? "" : "s"}`
                    : key
                }
              >
                <span>{day}</span>
                {hasBooking ? (
                  <span
                    className={cn(
                      "absolute bottom-1 h-1 w-1 rounded-full",
                      isSelected ? "bg-brand-foreground" : "bg-brand",
                    )}
                  />
                ) : null}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-muted">
          Marked days have bookings. Tap a day to filter, or use{" "}
          <span className="text-foreground">Show all bookings</span> above to
          clear the filter.
        </p>
      </aside>
    </div>
  );
}
