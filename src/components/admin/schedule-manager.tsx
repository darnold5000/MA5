"use client";

import { useMemo, useState } from "react";
import { useServerRefresh } from "@/hooks/use-server-refresh";

import type { SessionItem } from "@/features/scheduling/fallback-data";
import { FALLBACK_CLASS_TYPES } from "@/features/scheduling/fallback-data";
import {
  formatDurationMinutes,
  formatMoney,
  formatSessionWhen,
} from "@/features/scheduling/format";

type AdminScheduleManagerProps = {
  sessions: SessionItem[];
};

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminScheduleManager({ sessions }: AdminScheduleManagerProps) {
  const { router, refresh, isRefreshing } = useServerRefresh();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [classTypeId, setClassTypeId] = useState(FALLBACK_CLASS_TYPES[1].id);
  const [startsAt, setStartsAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(
    FALLBACK_CLASS_TYPES[1].defaultDurationMinutes,
  );
  const [capacity, setCapacity] = useState(10);
  const [coachName, setCoachName] = useState("Robert Anderson");

  const sorted = useMemo(
    () => [...sessions].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [sessions],
  );

  function onClassTypeChange(id: string) {
    setClassTypeId(id);
    const ct = FALLBACK_CLASS_TYPES.find((c) => c.id === id);
    if (ct) {
      setDurationMinutes(ct.defaultDurationMinutes);
      setCapacity(ct.defaultCapacity);
    }
  }

  async function createSession() {
    if (!startsAt) {
      setError("Pick a start time");
      return;
    }
    setPending(true);
    setError(null);
    const res = await fetch("/api/admin/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classTypeId,
        startsAt: new Date(startsAt).toISOString(),
        durationMinutes,
        capacity,
        coachName,
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create session");
      return;
    }
    setCreating(false);
    setStartsAt("");
    refresh();
  }

  async function patchSession(
    sessionId: string,
    changes: Record<string, unknown>,
  ) {
    setPending(true);
    setError(null);
    const res = await fetch("/api/admin/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, ...changes }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Update failed");
      return;
    }
    setEditingId(null);
    refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Create classes, edit details, or cancel sessions. Changes apply to the
          client schedule immediately in this preview.
        </p>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="inline-flex min-h-11 items-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase"
        >
          {creating ? "Close form" : "New class"}
        </button>
      </div>

      {error ? (
        <p className="text-sm text-brand" role="alert">
          {error}
        </p>
      ) : null}

      {creating ? (
        <div className="grid gap-3 border border-border bg-surface p-5 sm:grid-cols-2">
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="text-xs font-semibold tracking-wide uppercase">
              Class type
            </span>
            <select
              value={classTypeId}
              onChange={(e) => onClassTypeChange(e.target.value)}
              className="min-h-11 w-full border border-border bg-background px-3"
            >
              {FALLBACK_CLASS_TYPES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.defaultDurationMinutes} min)
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-semibold tracking-wide uppercase">
              Starts
            </span>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="min-h-11 w-full border border-border bg-background px-3"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-semibold tracking-wide uppercase">
              Length (min)
            </span>
            <input
              type="number"
              min={15}
              max={480}
              step={15}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="min-h-11 w-full border border-border bg-background px-3"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-semibold tracking-wide uppercase">
              Capacity
            </span>
            <input
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className="min-h-11 w-full border border-border bg-background px-3"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-semibold tracking-wide uppercase">
              Coach
            </span>
            <input
              value={coachName}
              onChange={(e) => setCoachName(e.target.value)}
              className="min-h-11 w-full border border-border bg-background px-3"
            />
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={createSession}
            className="inline-flex min-h-11 items-center justify-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase sm:col-span-2"
          >
            {pending ? "Saving…" : "Create class"}
          </button>
        </div>
      ) : null}

      <div className="space-y-3">
        {sorted.map((session) => {
          const editing = editingId === session.id;
          return (
            <article
              key={session.id}
              className="border border-border bg-surface p-5"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
                    {session.status}
                  </p>
                  <h3 className="mt-1 font-display text-xl tracking-wide uppercase">
                    {session.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {formatSessionWhen(session.startsAt)} ·{" "}
                    {formatDurationMinutes(session.durationMinutes)} · Coach{" "}
                    {session.coachName} · {session.bookedCount}/
                    {session.capacity} booked
                    {session.priceCents > 0
                      ? ` · ${formatMoney(session.priceCents)}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingId((id) =>
                        id === session.id ? null : session.id,
                      )
                    }
                    className="inline-flex min-h-10 items-center border border-border px-3 text-[11px] font-semibold tracking-wide uppercase"
                  >
                    {editing ? "Close" : "Edit"}
                  </button>
                  {session.status !== "cancelled" ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        patchSession(session.id, { status: "cancelled" })
                      }
                      className="inline-flex min-h-10 items-center border border-border px-3 text-[11px] font-semibold tracking-wide uppercase"
                    >
                      Cancel class
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        patchSession(session.id, { status: "published" })
                      }
                      className="inline-flex min-h-10 items-center border border-border px-3 text-[11px] font-semibold tracking-wide uppercase"
                    >
                      Republish
                    </button>
                  )}
                </div>
              </div>

              {editing ? (
                <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="text-xs uppercase">Title</span>
                    <input
                      id={`title-${session.id}`}
                      defaultValue={session.title}
                      className="min-h-10 w-full border border-border bg-background px-3"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-xs uppercase">Starts</span>
                    <input
                      id={`starts-${session.id}`}
                      type="datetime-local"
                      defaultValue={toLocalInputValue(session.startsAt)}
                      className="min-h-10 w-full border border-border bg-background px-3"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-xs uppercase">Length (min)</span>
                    <input
                      id={`dur-${session.id}`}
                      type="number"
                      min={15}
                      max={480}
                      step={15}
                      defaultValue={session.durationMinutes}
                      className="min-h-10 w-full border border-border bg-background px-3"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-xs uppercase">Capacity</span>
                    <input
                      id={`cap-${session.id}`}
                      type="number"
                      min={1}
                      defaultValue={session.capacity}
                      className="min-h-10 w-full border border-border bg-background px-3"
                    />
                  </label>
                  <label className="space-y-1 text-sm sm:col-span-2">
                    <span className="text-xs uppercase">Coach</span>
                    <input
                      id={`coach-${session.id}`}
                      defaultValue={session.coachName}
                      className="min-h-10 w-full border border-border bg-background px-3"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      const title = (
                        document.getElementById(
                          `title-${session.id}`,
                        ) as HTMLInputElement
                      ).value;
                      const starts = (
                        document.getElementById(
                          `starts-${session.id}`,
                        ) as HTMLInputElement
                      ).value;
                      const dur = Number(
                        (
                          document.getElementById(
                            `dur-${session.id}`,
                          ) as HTMLInputElement
                        ).value,
                      );
                      const cap = Number(
                        (
                          document.getElementById(
                            `cap-${session.id}`,
                          ) as HTMLInputElement
                        ).value,
                      );
                      const coach = (
                        document.getElementById(
                          `coach-${session.id}`,
                        ) as HTMLInputElement
                      ).value;
                      patchSession(session.id, {
                        title,
                        startsAt: new Date(starts).toISOString(),
                        durationMinutes: dur,
                        capacity: cap,
                        coachName: coach,
                      });
                    }}
                    className="inline-flex min-h-11 items-center justify-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase sm:col-span-2"
                  >
                    Save changes
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
