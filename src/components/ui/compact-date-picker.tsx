"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
    </svg>
  );
}

type DatePickerPanelProps = {
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  minDate?: string;
  onAfterSelect?: () => void;
};

function DatePickerPanel({
  value,
  onChange,
  optional = true,
  minDate,
  onAfterSelect,
}: DatePickerPanelProps) {
  const initial = parseDayKey(value) ?? new Date();
  const [cursor, setCursor] = useState(() => ({
    year: initial.getFullYear(),
    month: initial.getMonth(),
  }));

  useEffect(() => {
    const parsed = parseDayKey(value);
    if (parsed) {
      setCursor({ year: parsed.getFullYear(), month: parsed.getMonth() });
    }
  }, [value]);

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

  function isDisabled(key: string) {
    if (!minDate) return false;
    return key < minDate;
  }

  function selectDay(key: string) {
    const next = value === key && optional ? "" : key;
    onChange(next);
    if (next) onAfterSelect?.();
  }

  return (
    <div className="p-3.5">
      <div className="mb-2 flex min-h-8 items-center justify-end">
        {optional && value ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              onAfterSelect?.();
            }}
            className="text-[10px] font-semibold tracking-wide text-brand uppercase hover:underline"
          >
            Clear date
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
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-sm text-muted transition hover:border-brand/50 hover:text-foreground"
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
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-sm text-muted transition hover:border-brand/50 hover:text-foreground"
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
              onClick={() => selectDay(key)}
              className={cn(
                "flex h-8 items-center justify-center rounded-md text-xs transition",
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

export type CompactDatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  /** ISO date YYYY-MM-DD — days before this are not selectable */
  minDate?: string;
  className?: string;
  placeholder?: string;
};

export function CompactDatePicker({
  value,
  onChange,
  optional = true,
  minDate,
  className,
  placeholder = "Select date (optional)",
}: CompactDatePickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const display = value ? formatDisplay(value) : null;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative w-full max-w-md", className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-border bg-background px-3.5 py-2.5 text-left text-sm transition",
          "hover:border-brand/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20",
          open && "border-brand ring-2 ring-brand/20",
        )}
      >
        <span className={cn(display ? "font-medium text-foreground" : "text-muted")}>
          {display ?? placeholder}
        </span>
        <CalendarIcon className="h-4 w-4 shrink-0 text-muted" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Choose date"
          className="absolute top-full left-0 z-50 mt-2 w-[17.5rem] overflow-hidden rounded-xl border border-border bg-background shadow-lg ring-1 ring-black/5"
        >
          <DatePickerPanel
            value={value}
            onChange={onChange}
            optional={optional}
            minDate={minDate}
            onAfterSelect={() => setOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
