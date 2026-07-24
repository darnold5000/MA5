"use client";

import { useMemo, useState } from "react";
import { useServerRefresh } from "@/hooks/use-server-refresh";

import {
  MEMBER_SERVICE_FILTERS,
  isMemberServiceFilter,
} from "@/content/member-services";
import type { SessionItem } from "@/features/scheduling/fallback-data";
import {
  formatDurationMinutes,
  formatMoney,
  formatSessionDay,
  formatSessionTime,
} from "@/features/scheduling/format";
import { cn } from "@/lib/utils";

type ScheduleBrowserProps = {
  sessions: SessionItem[];
  /** sessionId → payment_status for the client's active booking */
  enrolledBySessionId?: Record<string, string>;
  /** Pre-select a service filter (e.g. from /book?type=… → /app/schedule?service=) */
  initialService?: string;
};

type WeekFilter = "this" | "next" | "all";

const SERVICE_FILTERS = MEMBER_SERVICE_FILTERS;

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

export function ScheduleBrowser({
  sessions,
  enrolledBySessionId = {},
  initialService = "all",
}: ScheduleBrowserProps) {
  const { router, refresh, isRefreshing } = useServerRefresh();
  const enrolled = useMemo(
    () => new Set(Object.keys(enrolledBySessionId)),
    [enrolledBySessionId],
  );
  const [week, setWeek] = useState<WeekFilter>("this");
  const [service, setService] = useState<string>(() => {
    return initialService && isMemberServiceFilter(initialService)
      ? initialService
      : "all";
  });
  const [availableOnly, setAvailableOnly] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bookingSession, setBookingSession] = useState<SessionItem | null>(
    null,
  );
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
      const isEnrolled = enrolled.has(s.id);
      const spots = s.capacity - s.bookedCount;
      // Keep enrolled sessions visible even when "available only" is on.
      if (
        availableOnly &&
        !isEnrolled &&
        (spots <= 0 || s.status === "full")
      ) {
        return false;
      }
      return true;
    });
  }, [sessions, week, service, availableOnly, enrolled]);

  async function confirmBooking(payAtFacility: boolean) {
    if (!bookingSession) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: bookingSession.id,
          paymentStatus:
            bookingSession.priceCents > 0 && payAtFacility
              ? "pay_at_facility"
              : bookingSession.priceCents > 0
                ? "pending"
                : "not_required",
        }),
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
      refresh();
    } catch {
      setError("Booking failed");
      setPending(false);
    }
  }

  async function payAndBook() {
    if (!bookingSession) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/session-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: bookingSession.id }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setError(
        data.error ??
          "Online payment unavailable. You can still book and pay at the facility.",
      );
      setPending(false);
    } catch {
      setError("Could not start payment");
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
                ? "border-brand bg-brand text-brand-foreground"
                : "border-border text-muted hover:border-brand hover:text-foreground",
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
            const isEnrolled = enrolled.has(session.id);
            const paymentStatus = enrolledBySessionId[session.id];
            const open = expandedId === session.id;
            return (
              <article
                key={session.id}
                className="border border-border bg-surface p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-2xl tracking-wide uppercase sm:text-3xl">
                        {session.title}
                      </h3>
                      {isEnrolled ? (
                        <span className="inline-flex items-center gap-1.5 hub-badge-success px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                          <span aria-hidden>●</span> Enrolled
                        </span>
                      ) : null}
                      {isEnrolled && paymentStatus === "paid" ? (
                        <span className="border border-border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                          Paid
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-base text-foreground">
                      {formatSessionDay(session.startsAt)}
                    </p>
                    <p className="mt-1 text-xl text-foreground">
                      {formatSessionTime(session.startsAt)}
                      <span className="text-muted">
                        {" "}
                        · {formatDurationMinutes(session.durationMinutes)}
                      </span>
                    </p>
                    <div className="mt-4 space-y-1 text-sm text-muted">
                      <p>Coach {session.coachName.split(" ")[0]}</p>
                      <p>
                        {isEnrolled
                          ? "You’re on the roster"
                          : full
                            ? "Full"
                            : `${spots} spots remaining`}
                      </p>
                      <p>
                        {isEnrolled && paymentStatus === "paid"
                          ? "Paid online"
                          : isEnrolled &&
                              (paymentStatus === "included" ||
                                session.priceCents <= 0)
                            ? "Included in membership"
                            : session.priceCents > 0
                              ? formatMoney(session.priceCents)
                              : "Included in membership"}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId((c) =>
                          c === session.id ? null : session.id,
                        )
                      }
                      className="inline-flex min-h-11 items-center border border-border px-4 text-xs font-semibold tracking-wide uppercase"
                    >
                      {open ? "Hide details" : "Details"}
                    </button>
                    {!isEnrolled ? (
                      <button
                        type="button"
                        disabled={full}
                        onClick={() => {
                          setError(null);
                          setBookingSession(session);
                        }}
                        className="inline-flex min-h-11 items-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50"
                      >
                        Reserve
                      </button>
                    ) : null}
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
              Ready to book?
            </p>
            <h2
              id="book-modal-title"
              className="mt-2 font-display text-2xl tracking-wide uppercase"
            >
              Reserve your spot
            </h2>
            <p className="mt-4 text-base text-foreground">
              {formatSessionDay(bookingSession.startsAt)}
            </p>
            <p className="mt-1 text-xl text-foreground">
              {formatSessionTime(bookingSession.startsAt)}
              <span className="text-muted">
                {" "}
                · {formatDurationMinutes(bookingSession.durationMinutes)}
              </span>
            </p>
            <p className="mt-4 font-display text-lg tracking-wide uppercase">
              {bookingSession.title}
            </p>
            <p className="mt-2 text-sm text-muted">
              Coach {bookingSession.coachName.split(" ")[0]}
            </p>
            {bookingSession.priceCents > 0 ? (
              <p className="mt-2 text-sm text-muted">
                {formatMoney(bookingSession.priceCents)}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted">Included in membership</p>
            )}
            {error ? (
              <p className="mt-3 text-sm text-brand" role="alert">
                {error}
              </p>
            ) : null}
            <div className="mt-6 flex flex-col gap-3">
              {bookingSession.priceCents > 0 ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={payAndBook}
                  className="inline-flex min-h-11 w-full items-center justify-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50"
                >
                  {pending ? "Starting…" : "Pay online"}
                </button>
              ) : null}
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  confirmBooking(bookingSession.priceCents > 0)
                }
                className={cn(
                  "inline-flex min-h-11 w-full items-center justify-center px-4 text-xs font-semibold tracking-wide uppercase disabled:opacity-50",
                  bookingSession.priceCents > 0
                    ? "border border-border"
                    : "bg-brand text-brand-foreground",
                )}
              >
                {pending
                  ? "Reserving…"
                  : bookingSession.priceCents > 0
                    ? "Pay at facility"
                    : "Reserve spot"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setBookingSession(null)}
                className="inline-flex min-h-11 w-full items-center justify-center border border-border px-4 text-xs font-semibold tracking-wide uppercase"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
