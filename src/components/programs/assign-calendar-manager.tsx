"use client";

import { useMemo, useState } from "react";
import { useServerRefresh } from "@/hooks/use-server-refresh";

import { CoachWorkoutReviewPanel } from "@/components/programs/coach-workout-review-panel";
import type {
  CalendarEntry,
  Program,
  Workout,
  WorkoutCompletion,
} from "@/features/programs/types";

type ClientOption = { id: string; name: string };

type Props = {
  clients: ClientOption[];
  workouts: Workout[];
  programs: Program[];
  calendarEntries: CalendarEntry[];
  completions: WorkoutCompletion[];
};

export function AssignCalendarManager({
  clients,
  workouts,
  programs,
  calendarEntries,
  completions,
}: Props) {
  const { router, refresh, isRefreshing } = useServerRefresh();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [workoutId, setWorkoutId] = useState(workouts[0]?.id ?? "");
  const [programId, setProgramId] = useState(programs[0]?.id ?? "");
  const [entryDate, setEntryDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const entries = useMemo(
    () =>
      calendarEntries
        .filter((e) => e.clientUserId === clientId)
        .sort((a, b) => a.entryDate.localeCompare(b.entryDate)),
    [calendarEntries, clientId],
  );

  const selectedClientName =
    clients.find((client) => client.id === clientId)?.name ?? "Client";

  const completionByEntryId = useMemo(() => {
    const map = new Map<string, WorkoutCompletion>();
    for (const completion of completions) {
      if (completion.clientUserId === clientId) {
        map.set(completion.calendarEntryId, completion);
      }
    }
    return map;
  }, [clientId, completions]);

  async function post(body: unknown) {
    setPending(true);
    setError(null);
    const res = await fetch("/api/admin/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Request failed");
      return null;
    }
    refresh();
    return data;
  }

  return (
    <div className="space-y-6">
      <div className="th-card p-5">
        <label className="block max-w-md space-y-2 text-sm">
          <span className="text-xs font-semibold tracking-wide uppercase th-muted">
            Client
          </span>
          <select
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              setSelectedEntryId(null);
            }}
            className="th-input"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="th-card p-5">
          <h2 className="text-lg font-bold">
            Add workout day
          </h2>
          <div className="mt-4 space-y-3">
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="th-input"
            />
            <select
              value={workoutId}
              onChange={(e) => setWorkoutId(e.target.value)}
              className="th-input"
            >
              {workouts.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                post({
                  action: "addCalendarEntry",
                  clientUserId: clientId,
                  workoutId,
                  entryDate,
                  publish: false,
                })
              }
              className="inline-flex min-h-11 items-center border border-[var(--th-border)] px-5 text-xs font-semibold tracking-wide uppercase disabled:opacity-50"
            >
              Add draft
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                post({
                  action: "addCalendarEntry",
                  clientUserId: clientId,
                  workoutId,
                  entryDate,
                  publish: true,
                })
              }
              className="th-btn-primary ml-2 disabled:opacity-50"
            >
              Add & publish
            </button>
          </div>
        </section>

        <section className="th-card p-5">
          <h2 className="text-lg font-bold">
            Assign program
          </h2>
          <div className="mt-4 space-y-3">
            <select
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              className="th-input"
            >
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="th-input"
            />
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                post({
                  action: "assignProgram",
                  programId,
                  clientUserId: clientId,
                  startDate,
                  publish: true,
                })
              }
              className="th-btn-primary disabled:opacity-50"
            >
              Assign & publish
            </button>
          </div>
        </section>
      </div>

      <section className="th-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">
            Calendar
          </h2>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              post({
                action: "publishCalendarEntries",
                all: true,
                clientUserId: clientId,
              })
            }
            className="text-xs font-semibold tracking-wide text-[var(--th-blue)] uppercase hover:underline"
          >
            Publish all drafts
          </button>
        </div>
        <ul className="mt-4 space-y-2">
          {entries.map((e) => {
            const completed = completionByEntryId.has(e.id);
            const isSelected = selectedEntryId === e.id;
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedEntryId((current) =>
                      current === e.id ? null : e.id,
                    )
                  }
                  className={`flex w-full flex-wrap items-center justify-between gap-2 border px-3 py-2 text-left text-sm transition ${
                    isSelected
                      ? "border-[var(--th-blue)] bg-[var(--th-blue)]/5"
                      : "border-[var(--th-border)] bg-[var(--th-surface)] hover:border-[var(--th-blue)]/40"
                  }`}
                >
                  <span>
                    <span className="font-semibold">{e.entryDate}</span> · {e.title}
                  </span>
                  <span className="flex items-center gap-2 text-xs tracking-wide th-muted uppercase">
                    {completed ? (
                      <span className="text-emerald-600">Completed</span>
                    ) : null}
                    <span>
                      {e.publishStatus} · {e.source}
                    </span>
                    <span className="text-[var(--th-blue)]">
                      {isSelected ? "Hide" : "Review"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {entries.length === 0 ? (
            <li className="text-sm th-muted">No calendar entries yet.</li>
          ) : null}
        </ul>
      </section>

      {selectedEntryId ? (
        <CoachWorkoutReviewPanel
          mode="client"
          clientUserId={clientId}
          clientName={selectedClientName}
          calendarEntryId={selectedEntryId}
          onClose={() => setSelectedEntryId(null)}
        />
      ) : null}

      {error ? (
        <p className="text-sm text-[var(--th-blue)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
