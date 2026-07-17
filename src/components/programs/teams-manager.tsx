"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  CalendarEntry,
  Program,
  Team,
  TeamMember,
  Workout,
} from "@/features/programs/types";

type ClientOption = { id: string; name: string };

type Props = {
  teams: Team[];
  teamMembers: TeamMember[];
  calendarEntries: CalendarEntry[];
  workouts: Workout[];
  programs: Program[];
  clients: ClientOption[];
};

export function TeamsManager({
  teams,
  teamMembers,
  calendarEntries,
  workouts,
  programs,
  clients,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    teams[0]?.id ?? null,
  );
  const [name, setName] = useState("");
  const [memberId, setMemberId] = useState(clients[0]?.id ?? "");
  const [workoutId, setWorkoutId] = useState(workouts[0]?.id ?? "");
  const [entryDate, setEntryDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [programId, setProgramId] = useState(programs[0]?.id ?? "");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const selected = teams.find((t) => t.id === selectedId) ?? null;
  const members = useMemo(
    () => teamMembers.filter((m) => m.teamId === selectedId),
    [teamMembers, selectedId],
  );
  const entries = useMemo(
    () =>
      calendarEntries
        .filter((e) => e.teamId === selectedId)
        .sort((a, b) => a.entryDate.localeCompare(b.entryDate)),
    [calendarEntries, selectedId],
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
      <div className="border border-border bg-surface p-5">
        <h2 className="font-display text-xl tracking-wide uppercase">
          Create team
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={75}
            placeholder="Performance Group"
            className="min-h-11 w-72 border border-border bg-background px-3"
          />
          <button
            type="button"
            disabled={pending || !name.trim()}
            onClick={async () => {
              const data = await post({ action: "createTeam", name });
              if (data?.team) {
                setSelectedId(data.team.id);
                setName("");
              }
            }}
            className="inline-flex min-h-11 items-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50"
          >
            Create team
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-surface text-left text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="px-3 py-2">Team</th>
              <th className="px-3 py-2">Athletes</th>
              <th className="px-3 py-2">Sessions</th>
              <th className="px-3 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => {
              const count = teamMembers.filter((m) => m.teamId === t.id).length;
              const sessionCount = calendarEntries.filter(
                (e) => e.teamId === t.id,
              ).length;
              return (
                <tr
                  key={t.id}
                  className={`cursor-pointer border-t border-border ${
                    selectedId === t.id ? "bg-brand/10" : "bg-surface"
                  }`}
                  onClick={() => setSelectedId(t.id)}
                >
                  <td className="px-3 py-3 font-display tracking-wide uppercase">
                    {t.name}
                  </td>
                  <td className="px-3 py-3">{count}</td>
                  <td className="px-3 py-3">{sessionCount}</td>
                  <td className="px-3 py-3 text-muted">
                    {t.createdAt.slice(0, 10)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="border border-border bg-surface p-5">
            <h3 className="font-display text-xl tracking-wide uppercase">
              Roster · {selected.name}
            </h3>
            <ul className="mt-3 space-y-2">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between border border-border bg-background px-3 py-2"
                >
                  <span>{m.userName}</span>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => post({ action: "removeTeamMember", id: m.id })}
                    className="text-xs font-semibold tracking-wide text-muted uppercase hover:text-brand"
                  >
                    Remove
                  </button>
                </li>
              ))}
              {members.length === 0 ? (
                <li className="text-sm text-muted">No athletes yet.</li>
              ) : null}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="min-h-11 border border-border bg-background px-3"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={pending || !memberId}
                onClick={() => {
                  const client = clients.find((c) => c.id === memberId);
                  if (!client) return;
                  post({
                    action: "addTeamMember",
                    teamId: selected.id,
                    userId: client.id,
                    userName: client.name,
                  });
                }}
                className="inline-flex min-h-11 items-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50"
              >
                Add athlete
              </button>
            </div>
          </section>

          <section className="border border-border bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-xl tracking-wide uppercase">
                Team calendar
              </h3>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  post({
                    action: "publishCalendarEntries",
                    all: true,
                    teamId: selected.id,
                  })
                }
                className="text-xs font-semibold tracking-wide text-brand uppercase hover:underline"
              >
                Publish all
              </button>
            </div>
            <ul className="mt-3 space-y-2">
              {entries.map((e) => (
                <li
                  key={e.id}
                  className="border border-border bg-background px-3 py-2 text-sm"
                >
                  <span className="font-semibold">{e.entryDate}</span> · {e.title}{" "}
                  <span className="text-xs text-muted uppercase">
                    {e.publishStatus}
                  </span>
                </li>
              ))}
              {entries.length === 0 ? (
                <li className="text-sm text-muted">No sessions yet.</li>
              ) : null}
            </ul>
            <div className="mt-4 space-y-2 border-t border-border pt-4">
              <p className="text-xs font-semibold tracking-wide uppercase">
                Add workout
              </p>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="min-h-11 w-full border border-border bg-background px-3"
              />
              <select
                value={workoutId}
                onChange={(e) => setWorkoutId(e.target.value)}
                className="min-h-11 w-full border border-border bg-background px-3"
              >
                {workouts.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={pending || !workoutId}
                onClick={() =>
                  post({
                    action: "addCalendarEntry",
                    teamId: selected.id,
                    workoutId,
                    entryDate,
                    publish: false,
                  })
                }
                className="inline-flex min-h-11 w-full items-center justify-center border border-border px-4 text-xs font-semibold tracking-wide uppercase disabled:opacity-50"
              >
                Add from library (draft)
              </button>
            </div>
            <div className="mt-4 space-y-2 border-t border-border pt-4">
              <p className="text-xs font-semibold tracking-wide uppercase">
                Assign program
              </p>
              <select
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
                className="min-h-11 w-full border border-border bg-background px-3"
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
                className="min-h-11 w-full border border-border bg-background px-3"
              />
              <button
                type="button"
                disabled={pending || !programId}
                onClick={() =>
                  post({
                    action: "assignProgram",
                    programId,
                    teamId: selected.id,
                    startDate,
                    publish: true,
                  })
                }
                className="inline-flex min-h-11 w-full items-center justify-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50"
              >
                Assign & publish
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-brand" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
