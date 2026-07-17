"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  CalendarEntry,
  Program,
  Workout,
} from "@/features/programs/types";

type ClientOption = { id: string; name: string };

type Props = {
  clients: ClientOption[];
  workouts: Workout[];
  programs: Program[];
  calendarEntries: CalendarEntry[];
};

export function AssignCalendarManager({
  clients,
  workouts,
  programs,
  calendarEntries,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
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
    router.refresh();
    return data;
  }

  return (
    <div className="space-y-6">
      <div className="th-card p-5">
        <label className="space-y-1 text-sm">
          <span className="text-xs font-semibold tracking-wide uppercase">
            Client
          </span>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="mt-1 th-input max-w-md"
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
              className="ml-2 inline-flex min-h-11 items-center bg-brand px-5 text-xs font-semibold tracking-wide text-[var(--th-blue)]-foreground uppercase disabled:opacity-50"
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
              className="inline-flex min-h-11 items-center bg-brand px-5 text-xs font-semibold tracking-wide text-[var(--th-blue)]-foreground uppercase disabled:opacity-50"
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
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex flex-wrap items-center justify-between gap-2 border border-[var(--th-border)] bg-white px-3 py-2 text-sm"
            >
              <span>
                <span className="font-semibold">{e.entryDate}</span> · {e.title}
              </span>
              <span className="text-xs tracking-wide th-muted uppercase">
                {e.publishStatus} · {e.source}
              </span>
            </li>
          ))}
          {entries.length === 0 ? (
            <li className="text-sm th-muted">No calendar entries yet.</li>
          ) : null}
        </ul>
      </section>

      {error ? (
        <p className="text-sm text-[var(--th-blue)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
