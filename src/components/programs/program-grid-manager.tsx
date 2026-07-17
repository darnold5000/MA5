"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { WorkoutsManager } from "@/components/programs/workouts-manager";
import type {
  Exercise,
  Program,
  ProgramDay,
  Workout,
  WorkoutBlock,
} from "@/features/programs/types";
import { cn } from "@/lib/utils";

type Props = {
  programs: Program[];
  programDays: ProgramDay[];
  workouts: Workout[];
  workoutBlocks: WorkoutBlock[];
  exercises: Exercise[];
  /** Open this program's grid when provided (from Library edit). */
  initialProgramId?: string | null;
  /** Start on create form when true and no program selected. */
  startInCreate?: boolean;
  onBackToList?: () => void;
  onProgramCreated?: (program: Program) => void;
};

type ActiveCell = { weekIndex: number; dayIndex: number };

export function ProgramGridManager({
  programs,
  programDays,
  workouts,
  workoutBlocks,
  exercises,
  initialProgramId = null,
  startInCreate = false,
  onBackToList,
  onProgramCreated,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (startInCreate) return null;
    return initialProgramId ?? programs[0]?.id ?? null;
  });
  const [showCreate, setShowCreate] = useState(
    startInCreate || (!initialProgramId && programs.length === 0),
  );
  const [title, setTitle] = useState("");
  const [weeks, setWeeks] = useState(4);
  const [menuCell, setMenuCell] = useState<ActiveCell | null>(null);
  const [libraryPicker, setLibraryPicker] = useState<ActiveCell | null>(null);
  const [librarySearch, setLibrarySearch] = useState("");
  const [editingDay, setEditingDay] = useState<
    (ActiveCell & { workoutId: string }) | null
  >(null);
  const [extraWorkouts, setExtraWorkouts] = useState<Workout[]>([]);
  const [localPrograms, setLocalPrograms] = useState<Program[]>([]);
  const [localProgramDays, setLocalProgramDays] = useState<ProgramDay[]>([]);

  const allPrograms = useMemo(() => {
    const byId = new Map(programs.map((p) => [p.id, p]));
    for (const p of localPrograms) byId.set(p.id, p);
    return Array.from(byId.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }, [programs, localPrograms]);

  const allProgramDays = useMemo(() => {
    const key = (d: ProgramDay) =>
      `${d.programId}:${d.weekIndex}:${d.dayIndex}`;
    const byKey = new Map(programDays.map((d) => [key(d), d]));
    for (const d of localProgramDays) {
      byKey.set(key(d), d);
    }
    return Array.from(byKey.values());
  }, [programDays, localProgramDays]);

  const allWorkouts = useMemo(() => {
    const ids = new Set(workouts.map((w) => w.id));
    return [
      ...workouts,
      ...extraWorkouts.filter((w) => !ids.has(w.id)),
    ];
  }, [workouts, extraWorkouts]);

  useEffect(() => {
    if (initialProgramId) {
      setSelectedId(initialProgramId);
      setShowCreate(false);
    }
  }, [initialProgramId]);

  // Drop local copies once the server props include them.
  useEffect(() => {
    const serverIds = new Set(programs.map((p) => p.id));
    setLocalPrograms((prev) => prev.filter((p) => !serverIds.has(p.id)));
  }, [programs]);

  useEffect(() => {
    const serverIds = new Set(programDays.map((d) => d.id));
    setLocalProgramDays((prev) => prev.filter((d) => !serverIds.has(d.id)));
  }, [programDays]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const selected = allPrograms.find((p) => p.id === selectedId) ?? null;
  const days = useMemo(
    () => allProgramDays.filter((d) => d.programId === selectedId),
    [allProgramDays, selectedId],
  );

  const filteredLibrary = useMemo(() => {
    const q = librarySearch.trim().toLowerCase();
    if (!q) return allWorkouts;
    return allWorkouts.filter((w) => w.title.toLowerCase().includes(q));
  }, [allWorkouts, librarySearch]);

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

  function dayCell(weekIndex: number, dayIndex: number) {
    return days.find(
      (d) => d.weekIndex === weekIndex && d.dayIndex === dayIndex,
    );
  }

  function isMenu(weekIndex: number, dayIndex: number) {
    return (
      menuCell?.weekIndex === weekIndex && menuCell?.dayIndex === dayIndex
    );
  }

  function patchLocalDay(
    weekIndex: number,
    dayIndex: number,
    workoutId: string | null,
  ) {
    if (!selectedId) return;
    const targetKey = `${selectedId}:${weekIndex}:${dayIndex}`;
    setLocalProgramDays((prev) => {
      const key = (d: ProgramDay) =>
        `${d.programId}:${d.weekIndex}:${d.dayIndex}`;
      const existing = prev.find((d) => key(d) === targetKey);
      const next: ProgramDay = existing
        ? { ...existing, workoutId }
        : {
            id: `pd_local_${selectedId}_${weekIndex}_${dayIndex}`,
            programId: selectedId,
            weekIndex,
            dayIndex,
            workoutId,
          };
      return [next, ...prev.filter((d) => key(d) !== targetKey)];
    });
  }

  async function createSession(weekIndex: number, dayIndex: number) {
    if (!selected) return;
    setMenuCell(null);
    setToast("Creating session…");
    const data = await post({
      action: "createWorkout",
      title: `Week ${weekIndex} Day ${dayIndex}`,
      coachInstructions: "",
    });
    if (!data?.workout) {
      setToast(null);
      return;
    }
    setExtraWorkouts((prev) => [data.workout as Workout, ...prev]);
    patchLocalDay(weekIndex, dayIndex, data.workout.id);
    await post({
      action: "setProgramDayWorkout",
      programId: selected.id,
      weekIndex,
      dayIndex,
      workoutId: data.workout.id,
    });
    setToast("Session added");
    setEditingDay({ weekIndex, dayIndex, workoutId: data.workout.id });
  }

  async function addFromLibrary(
    weekIndex: number,
    dayIndex: number,
    workoutId: string,
  ) {
    if (!selected) return;
    patchLocalDay(weekIndex, dayIndex, workoutId);
    const ok = await post({
      action: "setProgramDayWorkout",
      programId: selected.id,
      weekIndex,
      dayIndex,
      workoutId,
    });
    if (ok) {
      setLibraryPicker(null);
      setToast("Session added");
      setEditingDay({ weekIndex, dayIndex, workoutId });
    }
  }

  async function clearDay(weekIndex: number, dayIndex: number) {
    if (!selected) return;
    setMenuCell(null);
    patchLocalDay(weekIndex, dayIndex, null);
    await post({
      action: "setProgramDayWorkout",
      programId: selected.id,
      weekIndex,
      dayIndex,
      workoutId: null,
    });
  }

  if (showCreate && !selected) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        {onBackToList ? (
          <button type="button" onClick={onBackToList} className="th-link text-sm">
            ← Back to Programs
          </button>
        ) : null}
        <div className="th-card p-6">
          <h2 className="text-xl font-bold">Create Program</h2>
          <p className="mt-1 text-sm th-muted">
            Name the program, then build weeks and days on the grid.
          </p>
          <div className="mt-5 space-y-4">
            <label className="block space-y-1 text-sm">
              <span className="text-xs font-semibold tracking-wide uppercase th-muted">
                Name
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={75}
                className="th-input"
                placeholder="4 Week Program"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-xs font-semibold tracking-wide uppercase th-muted">
                Weeks
              </span>
              <input
                type="number"
                min={1}
                max={52}
                value={weeks}
                onChange={(e) => setWeeks(Number(e.target.value) || 1)}
                className="th-input w-28"
              />
            </label>
            <button
              type="button"
              disabled={pending || !title.trim()}
              onClick={async () => {
                const data = await post({
                  action: "createProgram",
                  title,
                  weeks,
                });
                if (data?.program) {
                  const created = data.program as Program;
                  const createdDays = (data.programDays as ProgramDay[] | undefined) ?? [];
                  setLocalPrograms((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
                  if (createdDays.length > 0) {
                    setLocalProgramDays((prev) => {
                      const without = prev.filter((d) => d.programId !== created.id);
                      return [...createdDays, ...without];
                    });
                  }
                  setSelectedId(created.id);
                  setShowCreate(false);
                  setTitle("");
                  if (data.cookieWarning) {
                    setError(String(data.cookieWarning));
                  }
                  onProgramCreated?.(created);
                }
              }}
              className="th-btn-primary w-full"
            >
              Create Program
            </button>
          </div>
          {error ? (
            <p className="mt-3 text-sm text-[var(--th-danger)]" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="th-card p-8 text-center text-sm th-muted">
        No program selected.{" "}
        <button
          type="button"
          className="th-link"
          onClick={() => setShowCreate(true)}
        >
          Create one
        </button>
      </div>
    );
  }

  // Day session editor: left mini calendar + workout builder
  if (editingDay) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setEditingDay(null)}
            className="th-link text-sm"
          >
            ← Back To Program
          </button>
          <p className="text-sm font-semibold text-[var(--th-text)]">
            Week {editingDay.weekIndex} Day {editingDay.dayIndex}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)]">
          <aside className="border border-[var(--th-border)] bg-white">
            <div className="border-b border-[var(--th-border)] bg-[#111827] px-3 py-2 text-xs font-semibold tracking-wide text-white uppercase">
              {selected.title}
            </div>
            <div className="max-h-[70vh] space-y-4 overflow-y-auto p-3">
              {Array.from({ length: selected.weeks }, (_, wi) => {
                const weekIndex = wi + 1;
                return (
                  <div key={weekIndex}>
                    <p className="mb-2 text-[10px] font-bold tracking-wide uppercase th-muted">
                      Week {weekIndex}
                    </p>
                    <div className="flex flex-nowrap gap-1.5">
                      {Array.from({ length: 7 }, (_, di) => {
                        const dayIndex = di + 1;
                        const cell = dayCell(weekIndex, dayIndex);
                        const hasSession = Boolean(cell?.workoutId);
                        const active =
                          editingDay.weekIndex === weekIndex &&
                          editingDay.dayIndex === dayIndex;
                        return (
                          <button
                            key={dayIndex}
                            type="button"
                            onClick={() => {
                              if (cell?.workoutId) {
                                setEditingDay({
                                  weekIndex,
                                  dayIndex,
                                  workoutId: cell.workoutId,
                                });
                              } else {
                                setEditingDay(null);
                                setMenuCell({ weekIndex, dayIndex });
                              }
                            }}
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                              active
                                ? "bg-[#111827] text-white"
                                : hasSession
                                  ? "bg-[var(--th-blue)]/15 text-[var(--th-blue)]"
                                  : "bg-[var(--th-surface-muted)] th-muted hover:bg-[var(--th-border)]",
                            )}
                          >
                            {(weekIndex - 1) * 7 + dayIndex}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          <div className="min-w-0">
            <WorkoutsManager
              workouts={allWorkouts}
              blocks={workoutBlocks}
              exercises={exercises}
              focusWorkoutId={editingDay.workoutId}
              embedded
            />
          </div>
        </div>

        {toast ? <Toast message={toast} /> : null}
        {error ? (
          <p className="text-sm text-[var(--th-danger)]" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {onBackToList ? (
            <button type="button" onClick={onBackToList} className="th-link text-sm">
              ← Back to Programs
            </button>
          ) : null}
          <h2 className="text-xl font-bold text-[var(--th-text)]">
            {selected.title}
          </h2>
          <span className="text-sm th-muted">{selected.weeks} week program</span>
        </div>
        {programs.length > 1 || allPrograms.length > 1 ? (
          <label className="flex items-center gap-2 text-sm">
            <span className="th-muted">Program</span>
            <select
              className="th-input h-9 w-auto min-w-[10rem]"
              value={selected.id}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {allPrograms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {/* TrainHeroic-style weeks × days grid */}
      <div
        className="border border-[var(--th-border)] bg-white"
        onClick={() => setMenuCell(null)}
      >
        <div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))] border-b border-[#111827] bg-[#111827] text-center text-[11px] font-bold tracking-wide text-white uppercase">
          <div className="border-r border-white/10 py-3" />
          {Array.from({ length: 7 }, (_, i) => (
            <div
              key={i}
              className="border-r border-white/10 py-3 last:border-r-0"
            >
              Day {i + 1}
            </div>
          ))}
        </div>

        {Array.from({ length: selected.weeks }, (_, wi) => {
          const weekIndex = wi + 1;
          return (
            <div
              key={weekIndex}
              className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))] border-b border-[var(--th-border)] last:border-b-0"
            >
              <div className="flex items-start border-r border-[var(--th-border)] bg-white px-2 py-3 text-[11px] font-bold tracking-wide uppercase th-muted">
                Week {weekIndex}
              </div>
              {Array.from({ length: 7 }, (_, di) => {
                const dayIndex = di + 1;
                const cell = dayCell(weekIndex, dayIndex);
                const workout = cell?.workoutId
                  ? allWorkouts.find((w) => w.id === cell.workoutId)
                  : null;
                const open = isMenu(weekIndex, dayIndex);

                return (
                  <div
                    key={dayIndex}
                    className={cn(
                      "relative min-h-[120px] border-r border-[var(--th-border)] last:border-r-0",
                      open && "bg-[var(--th-surface-muted)]",
                    )}
                  >
                    <button
                      type="button"
                      disabled={pending}
                      className="absolute inset-0 w-full p-2 text-left"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (workout && cell?.workoutId) {
                          setMenuCell(null);
                          setEditingDay({
                            weekIndex,
                            dayIndex,
                            workoutId: cell.workoutId,
                          });
                          return;
                        }
                        setMenuCell(
                          open ? null : { weekIndex, dayIndex },
                        );
                      }}
                    >
                      {workout ? (
                        <div className="rounded border border-[var(--th-border)] bg-white p-2 shadow-sm">
                          <p className="text-xs font-semibold leading-snug text-[var(--th-text)]">
                            {workout.title}
                          </p>
                          <p className="mt-1 text-[10px] font-semibold tracking-wide text-[var(--th-blue)] uppercase">
                            Edit session
                          </p>
                        </div>
                      ) : open ? null : (
                        <span className="sr-only">
                          Empty — add session Week {weekIndex} Day {dayIndex}
                        </span>
                      )}
                    </button>

                    {open && !workout ? (
                      <div
                        className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[var(--th-surface-muted)]/95 p-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => void createSession(weekIndex, dayIndex)}
                          className="text-sm font-bold tracking-wide text-[var(--th-blue)] uppercase hover:underline disabled:opacity-50"
                        >
                          Create Session
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            setMenuCell(null);
                            setLibraryPicker({ weekIndex, dayIndex });
                            setLibrarySearch("");
                          }}
                          className="text-sm font-bold tracking-wide text-[var(--th-blue)] uppercase hover:underline disabled:opacity-50"
                        >
                          Add From Library
                        </button>
                      </div>
                    ) : null}

                    {workout ? (
                      <button
                        type="button"
                        className="absolute top-1 right-1 z-10 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase th-muted hover:bg-white hover:text-[var(--th-danger)]"
                        title="Clear day"
                        onClick={(e) => {
                          e.stopPropagation();
                          void clearDay(weekIndex, dayIndex);
                        }}
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {error ? (
        <p className="text-sm text-[var(--th-danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {toast ? <Toast message={toast} /> : null}

      {libraryPicker ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-from-library-title"
          onClick={() => setLibraryPicker(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-sm border border-[var(--th-border)] bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[var(--th-border)] px-5 py-4">
              <h3
                id="add-from-library-title"
                className="text-lg font-bold text-[var(--th-text)]"
              >
                Add From Library
              </h3>
              <p className="mt-1 text-sm th-muted">
                Week {libraryPicker.weekIndex} · Day {libraryPicker.dayIndex}
              </p>
            </div>
            <div className="px-5 py-3">
              <input
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                placeholder="Search sessions"
                className="th-input"
                autoFocus
              />
            </div>
            <ul className="max-h-72 overflow-y-auto border-t border-[var(--th-border)]">
              {filteredLibrary.length === 0 ? (
                <li className="px-5 py-8 text-center text-sm th-muted">
                  No sessions in library yet. Create a session first, or use
                  Create Session on the day.
                </li>
              ) : (
                filteredLibrary.map((w) => (
                  <li key={w.id}>
                    <button
                      type="button"
                      disabled={pending}
                      className="flex w-full items-center justify-between gap-3 border-b border-[var(--th-border)] px-5 py-3 text-left text-sm hover:bg-[var(--th-surface-muted)] disabled:opacity-50"
                      onClick={() =>
                        void addFromLibrary(
                          libraryPicker.weekIndex,
                          libraryPicker.dayIndex,
                          w.id,
                        )
                      }
                    >
                      <span className="font-semibold text-[var(--th-text)]">
                        {w.title}
                      </span>
                      <span className="text-xs font-bold tracking-wide text-[var(--th-blue)] uppercase">
                        Add
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="flex justify-end border-t border-[var(--th-border)] px-5 py-3">
              <button
                type="button"
                className="th-btn-ghost"
                onClick={() => setLibraryPicker(null)}
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

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-sm bg-[#111827] px-4 py-2.5 text-sm font-medium text-white shadow-lg">
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
      {message}
    </div>
  );
}
