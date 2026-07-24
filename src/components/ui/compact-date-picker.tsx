"use client";

import { useMemo, useState } from "react";

import { formatMonthLabel } from "@/features/scheduling/format";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

function startOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1);
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function toDayKey(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDayKey(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDisplay(value: string) {
  const d = parseDayKey(value);
  if (!d) return null;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export type CompactDatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  /** ISO date YYYY-MM-DD — days before this are not selectable */
  minDate?: string;
  className?: string;
};

export function CompactDatePicker({
  value,
  onChange,
  optional = true,
  minDate,
  className,
}: CompactDatePickerProps) {
  const initial = parseDayKey(value) ?? new Date();
  const [cursor, setCursor] = useState(() => ({
    year: initial.getFullYear(),
    month: initial.getMonth(),
  }));

  const cells = useMemo(() => {
    const firstWeekday = startOfMonth(cursor.year, cursor.month).getDay();
    const total = daysInMonth(cursor.year, cursor.month);
    const base: Array<number | null> = [
      ...Array.from({ length: firstWeekday }, () => null),
      ...Array.from({ length: total }, (_, i) => i + 1),
    ];
    while (base.length % 7 !== 0) base.push(null);
    return base;
  }, [cursor.year, cursor.month]);

  const todayKey = toDayKey(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate(),
  );

  const display = value ? formatDisplay(value) : null;

  function isDisabled(key: string) {
    if (!minDate) return false;
    return key < minDate;
  }

  return (
    <div
      className={cn(
        "w-full max-w-[17.5rem] border border-border bg-background p-3.5",
        className,
      )}
    >
      <div className="mb-2 flex min-h-9 flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-foreground">
          {display ? (
            <span className="font-medium">{display}</span>
          ) : (
            <span className="text-muted">No date selected</span>
          )}
        </p>
        {optional && value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[10px] font-semibold tracking-wide text-brand uppercase hover:underline"
          >
            Clear
          </button>
        ) : null}
      </div>

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
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center border border-border text-sm text-muted hover:border-brand hover:text-foreground"
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
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center border border-border text-sm text-muted hover:border-brand hover:text-foreground"
        >
          ›
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-0.5 text-center text-[10px] tracking-wide text-muted uppercase">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="mt-0.5 grid grid-cols-7 gap-0.5">
        {cells.map((day, index) => {
          if (day == null) {
            return <div key={`empty-${index}`} className="h-8" />;
          }

          const key = toDayKey(cursor.year, cursor.month, day);
          const disabled = isDisabled(key);
          const isSelected = value === key;
          const isToday = key === todayKey;

          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => onChange(isSelected && optional ? "" : key)}
              className={cn(
                "flex h-8 items-center justify-center text-xs transition",
                disabled && "cursor-not-allowed text-muted/40",
                !disabled && !isSelected && "text-foreground hover:bg-brand/15",
                isSelected && "bg-brand text-brand-foreground hover:bg-brand",
                !isSelected && isToday && "ring-1 ring-border",
              )}
              aria-label={key}
              aria-pressed={isSelected}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
