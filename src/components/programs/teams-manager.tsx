"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { CoachWorkoutReviewPanel } from "@/components/programs/coach-workout-review-panel";
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
  const today = new Date().toISOString().slice(0, 10);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    teams[0]?.id ?? null,
  );
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [memberId, setMemberId] = useState(clients[0]?.id ?? "");
  const [workoutId, setWorkoutId] = useState(workouts[0]?.id ?? "");
  const [entryDate, setEntryDate] = useState(today);
  const [programId, setProgramId] = useState(programs[0]?.id ?? "");
  const [startDate, setStartDate] = useState(today);

  const selected = teams.find((t) => t.id === selectedId) ?? null;
  const members = useMemo(
    () => teamMembers.filter((m) => m.teamId === selectedId),
    [teamMembers, selectedId],
  );
  const entries = useMemo(
    () =>
      calendarEntries
        .filter((e) => e.teamId === selectedId)
        .sort((a, b) => b.entryDate.localeCompare(a.entryDate)),
    [calendarEntries, selectedId],
  );
  const todayEntry = useMemo(
    () => entries.find((entry) => entry.entryDate === today) ?? null,
    [entries, today],
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
      <div className="th-card border-[var(--th-blue)]/30 bg-[var(--th-blue)]/5 p-5">
        <h2 className="text-lg font-bold">How small groups work</h2>
        <p className="mt-2 max-w-3xl text-sm th-muted">
          Create a group for each class roster (for example{" "}
          <span className="font-medium text-[var(--th-text)]">Small Group AM</span>
          ). Only athletes on that group&apos;s roster see the workout you post.
          1-on-1 clients stay on{" "}
          <span className="font-medium text-[var(--th-text)]">Assign</span> and
          never see group workouts unless you add them here.
        </p>
      </div>

      <div className="th-card p-5">
        <h2 className="text-lg font-bold">Create small group</h2>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block space-y-2 text-sm">
            <span className="text-xs font-semibold tracking-wide uppercase th-muted">
              Group name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={75}
              placeholder="Small Group AM"
              className="th-input min-h-11 w-72"
            />
          </label>
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
            className="th-btn-primary disabled:opacity-50"
          >
            Create group
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-[var(--th-border)]">
        <table className="min-w-full text-sm">
          <thead className="bg-white text-left text-xs tracking-wide th-muted uppercase">
            <tr>
              <th className="px-3 py-2">Group</th>
              <th className="px-3 py-2">Athletes</th>
              <th className="px-3 py-2">Sessions</th>
              <th className="px-3 py-2">Today</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => {
              const count = teamMembers.filter((m) => m.teamId === t.id).length;
              const sessionCount = calendarEntries.filter(
                (e) => e.teamId === t.id,
              ).length;
              const groupToday = calendarEntries.find(
                (e) => e.teamId === t.id && e.entryDate === today,
              );
              return (
                <tr
                  key={t.id}
                  className={`cursor-pointer border-t border-border ${
                    selectedId === t.id
                      ? "bg-[var(--th-blue)]/10"
                      : "bg-white"
                  }`}
                  onClick={() => {
                    setSelectedId(t.id);
                    setSelectedEntryId(null);
                  }}
                >
                  <td className="px-3 py-3 font-display tracking-wide uppercase">
                    {t.name}
                  </td>
                  <td className="px-3 py-3">{count}</td>
                  <td className="px-3 py-3">{sessionCount}</td>
                  <td className="px-3 py-3 th-muted">
                    {groupToday?.title ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected ? (
        <>
          <section className="th-card border-2 border-[var(--th-blue)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-wide uppercase text-[var(--th-blue)]">
                  Post today&apos;s class workout
                </p>
                <h3 className="mt-1 text-xl font-bold">{selected.name}</h3>
                <p className="mt-2 text-sm th-muted">
                  {members.length} athlete{members.length === 1 ? "" : "s"} on
                  this roster will see today&apos;s workout in the app and can
                  log weights during class.
                </p>
              </div>
              {todayEntry ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-800 uppercase">
                  Live today
                </span>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap items-end gap-3">
              <label className="block min-w-[240px] flex-1 space-y-2 text-sm">
                <span className="text-xs font-semibold tracking-wide uppercase th-muted">
                  Workout
                </span>
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
              </label>
              <button
                type="button"
                disabled={pending || !workoutId || members.length === 0}
                onClick={() =>
                  post({
                    action: "postTodayWorkout",
                    teamId: selected.id,
                    workoutId,
                  })
                }
                className="th-btn-primary min-h-11 px-6 disabled:opacity-50"
              >
                {todayEntry ? "Update today's workout" : "Post today's workout"}
              </button>
            </div>

            {members.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--th-blue)]">
                Add athletes to this group before posting.
              </p>
            ) : null}

            {todayEntry ? (
              <p className="mt-3 text-sm th-muted">
                Currently live: <strong>{todayEntry.title}</strong> (
                {todayEntry.publishStatus})
              </p>
            ) : null}
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="th-card p-5">
              <h3 className="text-lg font-bold">Roster · {selected.name}</h3>
              <ul className="mt-3 space-y-2">
                {members.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between border border-[var(--th-border)] bg-white px-3 py-2"
                  >
                    <span>{m.userName}</span>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        post({ action: "removeTeamMember", id: m.id })
                      }
                      className="text-xs font-semibold tracking-wide th-muted uppercase hover:text-[var(--th-blue)]"
                    >
                      Remove
                    </button>
                  </li>
                ))}
                {members.length === 0 ? (
                  <li className="text-sm th-muted">No athletes yet.</li>
                ) : null}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <select
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="th-input"
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
                  className="th-btn-primary disabled:opacity-50"
                >
                  Add athlete
                </button>
              </div>
            </section>

            <section className="th-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-bold">Group calendar</h3>
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
                  className="text-xs font-semibold tracking-wide text-[var(--th-blue)] uppercase hover:underline"
                >
                  Publish all drafts
                </button>
              </div>
              <ul className="mt-3 space-y-2">
                {entries.map((e) => {
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
                            : "border-[var(--th-border)] bg-white hover:border-[var(--th-blue)]/40"
                        }`}
                      >
                        <span>
                          <span className="font-semibold">{e.entryDate}</span> ·{" "}
                          {e.title}
                          {e.entryDate === today ? (
                            <span className="ml-2 text-xs text-emerald-600">
                              Today
                            </span>
                          ) : null}
                        </span>
                        <span className="text-xs tracking-wide th-muted uppercase">
                          {e.publishStatus} · Review
                        </span>
                      </button>
                    </li>
                  );
                })}
                {entries.length === 0 ? (
                  <li className="text-sm th-muted">No sessions yet.</li>
                ) : null}
              </ul>
              <div className="mt-4 space-y-2 border-t border-border pt-4">
                <p className="text-xs font-semibold tracking-wide uppercase">
                  Schedule another day
                </p>
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
                  disabled={pending || !workoutId}
                  onClick={() =>
                    post({
                      action: "addCalendarEntry",
                      teamId: selected.id,
                      workoutId,
                      entryDate,
                      publish: entryDate === today,
                    })
                  }
                  className="inline-flex min-h-11 w-full items-center justify-center border border-[var(--th-border)] px-4 text-xs font-semibold tracking-wide uppercase disabled:opacity-50"
                >
                  {entryDate === today
                    ? "Add & publish for selected date"
                    : "Add draft for selected date"}
                </button>
              </div>
              <div className="mt-4 space-y-2 border-t border-border pt-4">
                <p className="text-xs font-semibold tracking-wide uppercase">
                  Multi-week program
                </p>
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
                  className="th-btn-primary w-full disabled:opacity-50"
                >
                  Assign program to group
                </button>
              </div>
            </section>
          </div>

          {selectedEntryId ? (
            <CoachWorkoutReviewPanel
              mode="team"
              teamId={selected.id}
              calendarEntryId={selectedEntryId}
              onClose={() => setSelectedEntryId(null)}
            />
          ) : null}
        </>
      ) : null}

      {error ? (
        <p className="text-sm text-[var(--th-blue)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
