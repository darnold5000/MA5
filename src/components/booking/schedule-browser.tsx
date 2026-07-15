"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { SessionItem } from "@/features/scheduling/fallback-data";
import {
  formatMoney,
  formatSessionWhen,
} from "@/features/scheduling/format";
import { cn } from "@/lib/utils";

type ScheduleBrowserProps = {
  sessions: SessionItem[];
};

type WeekFilter = "this" | "next" | "all";

const SERVICE_FILTERS = [
  { id: "all", label: "All Sessions" },
  { id: "ct-small-group", label: "Small Group" },
  { id: "ct-assessment", label: "Assessment" },
  { id: "ct-sports", label: "Sports Performance" },
  { id: "ct-sauna", label: "Sauna" },
  { id: "ct-inbody", label: "InBody" },
] as const;

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}

function endOfWeek(d: Date) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 7);
  return e;
}

export function ScheduleBrowser({ sessions }: ScheduleBrowserProps) {
  const router = useRouter();
  const [week, setWeek] = useState<WeekFilter>("this");
  const [service, setService] = useState<string>("all");
  const [availableOnly, setAvailableOnly] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bookingSession, setBookingSession] = useState<SessionItem | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const now = new Date();
    const thisStart = startOfWeek(now);
    const thisEnd = endOfWeek(now);
    const nextEnd = new Date(thisEnd);
    nextEnd.setDate(nextEnd.getDate() + 7);

    return sessions.filter((s) => {
      const start = new Date(s.startsAt);
      if (week === "this" && (start < thisStart || start >= thisEnd)) return false;
      if (week === "next" && (start < thisEnd || start >= nextEnd)) return false;
      if (service !== "all" && s.classTypeId !== service) return false;
      const spots = s.capacity - s.bookedCount;
      if (availableOnly && (spots <= 0 || s.status === "full")) return false;
      return true;
    });
  }, [sessions, week, service, availableOnly]);

  async function confirmBooking() {
    if (!bookingSession) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: bookingSession.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Booking failed");
        setPending(false);
        return;
      }
      const conf = data.booking?.confirmationNumber as string;
      setBookingSession(null);
      router.push(`/app/bookings?booked=${encodeURIComponent(conf)}`);
      router.refresh();
    } catch {
      setError("Booking failed");
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["this", "This Week"],
            ["next", "Next Week"],
            ["all", "All Upcoming"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setWeek(id)}
            className={cn(
              "inline-flex min-h-10 items-center border px-4 text-xs font-semibold tracking-wide uppercase",
              week === id
                ? "border-brand bg-brand text-brand-foreground"
                : "border-border text-muted hover:border-brand hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {SERVICE_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setService(f.id)}
            className={cn(
              "inline-flex min-h-9 items-center border px-3 text-[11px] font-semibold tracking-wide uppercase",
              service === f.id
                ? "border-brand text-foreground"
                : "border-border text-muted hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={availableOnly}
          onChange={(e) => setAvailableOnly(e.target.checked)}
          className="size-4 accent-[var(--brand)]"
        />
        Only show available
      </label>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted">No sessions match these filters.</p>
        ) : (
          filtered.map((session) => {
            const spots = Math.max(session.capacity - session.bookedCount, 0);
            const full = spots <= 0 || session.status === "full";
            const open = expandedId === session.id;
            return (
              <article
                key={session.id}
                className={cn(
                  "border bg-surface p-5",
                  open ? "border-brand" : "border-border",
                )}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-display text-xl tracking-wide uppercase">
                      {session.title}
                    </h3>
                    <p className="mt-1 text-sm text-foreground">
                      {formatSessionWhen(session.startsAt)}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      Coach {session.coachName}
                      {" · "}
                      {full ? "Full" : `${spots} spots remaining`}
                      {" · "}
                      {session.priceCents > 0
                        ? `${formatMoney(session.priceCents)} or included with membership`
                        : "Included / inquire"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId((c) => (c === session.id ? null : session.id))
                      }
                      className="inline-flex min-h-11 items-center border border-border px-4 text-xs font-semibold tracking-wide uppercase"
                    >
                      {open ? "Hide details" : "View details"}
                    </button>
                    <button
                      type="button"
                      disabled={full}
                      onClick={() => {
                        setError(null);
                        setBookingSession(session);
                      }}
                      className="inline-flex min-h-11 items-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50"
                    >
                      Book
                    </button>
                  </div>
                </div>
                {open ? (
                  <div className="mt-4 border-t border-border pt-4 text-sm text-muted">
                    <p>{session.description}</p>
                    <p className="mt-2">{session.locationName}</p>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>

      {bookingSession ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="book-modal-title"
            className="w-full max-w-md border border-border bg-background p-6"
          >
            <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
              Confirm booking
            </p>
            <h2
              id="book-modal-title"
              className="mt-2 font-display text-2xl tracking-wide uppercase"
            >
              {bookingSession.title}
            </h2>
            <p className="mt-3 text-sm text-muted">
              {formatSessionWhen(bookingSession.startsAt)}
              {" · "}
              Coach {bookingSession.coachName}
            </p>
            <p className="mt-2 text-sm text-muted">
              {bookingSession.priceCents > 0
                ? `${formatMoney(bookingSession.priceCents)} · pay at facility or use membership`
                : "Included with membership / inquire"}
            </p>
            {error ? (
              <p className="mt-3 text-sm text-brand" role="alert">
                {error}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={confirmBooking}
                className="inline-flex min-h-11 flex-1 items-center justify-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50"
              >
                {pending ? "Booking…" : "Confirm"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setBookingSession(null)}
                className="inline-flex min-h-11 items-center border border-border px-4 text-xs font-semibold tracking-wide uppercase"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
