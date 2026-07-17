"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { ExerciseFormDrawer } from "@/components/programs/exercise-form-drawer";
import { ProgramGridManager } from "@/components/programs/program-grid-manager";
import { WorkoutsManager } from "@/components/programs/workouts-manager";
import {
  EXERCISE_CATEGORIES,
  isLibraryExerciseId,
  type ExerciseCategory,
} from "@/features/programs/exercise-library";
import type {
  Exercise,
  Program,
  ProgramDay,
  Workout,
  WorkoutBlock,
} from "@/features/programs/types";
import { cn } from "@/lib/utils";

export type LibraryTab = "programs" | "sessions" | "exercises";

type LibraryWorkspaceProps = {
  initialTab?: LibraryTab;
  exercises: Exercise[];
  workouts: Workout[];
  workoutBlocks: WorkoutBlock[];
  programs: Program[];
  programDays: ProgramDay[];
};

const TABS: { id: LibraryTab; label: string; createLabel: string }[] = [
  { id: "programs", label: "Programs", createLabel: "Create Program" },
  { id: "sessions", label: "Sessions", createLabel: "Create Session Template" },
  { id: "exercises", label: "Exercises", createLabel: "Create Exercise" },
];

type ExerciseDrawerState =
  | null
  | { mode: "create" }
  | { mode: "edit"; id: string };

export function LibraryWorkspace({
  initialTab = "exercises",
  exercises,
  workouts,
  workoutBlocks,
  programs,
  programDays,
}: LibraryWorkspaceProps) {
  const router = useRouter();
  const [tab, setTab] = useState<LibraryTab>(initialTab);
  const [mode, setMode] = useState<"list" | "edit">("list");
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [creatingProgram, setCreatingProgram] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [exerciseDrawer, setExerciseDrawer] =
    useState<ExerciseDrawerState>(null);
  const [localPrograms, setLocalPrograms] = useState<Program[]>([]);
  const [localExercises, setLocalExercises] = useState<Exercise[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [exerciseCategory, setExerciseCategory] = useState<
    ExerciseCategory | ""
  >("");

  const active = TABS.find((t) => t.id === tab)!;

  const mergedPrograms = useMemo(() => {
    const byId = new Map(programs.map((p) => [p.id, p]));
    for (const p of localPrograms) byId.set(p.id, p);
    return Array.from(byId.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }, [programs, localPrograms]);

  const mergedExercises = useMemo(() => {
    const byId = new Map(exercises.map((e) => [e.id, e]));
    for (const e of localExercises) byId.set(e.id, e);
    return Array.from(byId.values()).sort((a, b) => {
      const aLib = isLibraryExerciseId(a.id);
      const bLib = isLibraryExerciseId(b.id);
      if (aLib !== bLib) return aLib ? 1 : -1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [exercises, localExercises]);

  useEffect(() => {
    const ids = new Set(programs.map((p) => p.id));
    setLocalPrograms((prev) => {
      const next = prev.filter((p) => !ids.has(p.id));
      return next.length === prev.length ? prev : next;
    });
  }, [programs]);

  useEffect(() => {
    const ids = new Set(exercises.map((e) => e.id));
    setLocalExercises((prev) => {
      const next = prev.filter((e) => !ids.has(e.id));
      return next.length === prev.length ? prev : next;
    });
  }, [exercises]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

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

  function switchTab(next: LibraryTab) {
    setTab(next);
    setMode("list");
    setEditingProgramId(null);
    setCreatingProgram(false);
    setEditingSessionId(null);
    setCreatingSession(false);
    setExerciseDrawer(null);
    setSelectedIds([]);
    setSearch("");
    setExerciseCategory("");
    setError(null);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState({}, "", url.pathname + "?" + url.searchParams.toString());
  }

  function openCreate() {
    setError(null);
    if (tab === "exercises") {
      setExerciseDrawer({ mode: "create" });
      return;
    }
    setMode("edit");
    if (tab === "programs") {
      setCreatingProgram(true);
      setEditingProgramId(null);
    } else if (tab === "sessions") {
      setCreatingSession(true);
      setEditingSessionId(null);
    }
  }

  function openEditProgram(id: string) {
    setEditingProgramId(id);
    setCreatingProgram(false);
    setMode("edit");
    setError(null);
  }

  function openEditSession(id: string) {
    setEditingSessionId(id);
    setCreatingSession(false);
    setMode("edit");
    setError(null);
  }

  function backToList() {
    setMode("list");
    setEditingProgramId(null);
    setCreatingProgram(false);
    setEditingSessionId(null);
    setCreatingSession(false);
  }

  const filteredExercises = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mergedExercises.filter((e) => {
      if (exerciseCategory && e.category !== exerciseCategory) return false;
      if (q && !e.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [mergedExercises, search, exerciseCategory]);

  const filteredWorkouts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return workouts;
    return workouts.filter((w) => w.title.toLowerCase().includes(q));
  }, [workouts, search]);

  const filteredPrograms = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return mergedPrograms;
    return mergedPrograms.filter((p) => p.title.toLowerCase().includes(q));
  }, [mergedPrograms, search]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function deleteSelected() {
    if (selectedIds.length === 0) return;
    const action =
      tab === "exercises"
        ? "deleteExercise"
        : tab === "sessions"
          ? "deleteWorkout"
          : "deleteProgram";
    for (const id of selectedIds) {
      const ok = await post({ action, id });
      if (!ok) return;
    }
    setSelectedIds([]);
  }

  async function deleteOne(id: string) {
    const action =
      tab === "exercises"
        ? "deleteExercise"
        : tab === "sessions"
          ? "deleteWorkout"
          : "deleteProgram";
    const ok = await post({ action, id });
    if (ok) setSelectedIds((prev) => prev.filter((x) => x !== id));
  }

  return (
    <div className="space-y-4">
      {/* Sub-nav sits on the page — no outer card so dropdowns aren't clipped */}
      <div className="flex flex-wrap items-center gap-1 border-b border-[var(--th-border)] bg-[#111827] px-3 pt-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => switchTab(t.id)}
            className={cn(
              "px-4 py-3 text-sm font-medium transition",
              tab === t.id
                ? "border-b-2 border-white text-white"
                : "border-b-2 border-transparent text-white/60 hover:text-white",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {mode === "list" ? (
        <div className="space-y-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--th-text)]">
                My {active.label}
              </p>
              <p className="text-xs th-muted">
                Saved {active.label.toLowerCase()} — edit or delete, or create
                new.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={pending || selectedIds.length === 0}
                onClick={() => void deleteSelected()}
                className="inline-flex h-10 w-10 items-center justify-center rounded border border-[var(--th-border)] text-[var(--th-muted)] hover:text-[var(--th-danger)] disabled:opacity-40"
                aria-label="Delete selected"
                title="Delete selected"
              >
                <TrashIcon />
              </button>
              {tab === "exercises" ? (
                <label className="relative">
                  <span className="sr-only">Filter by type</span>
                  <select
                    value={exerciseCategory}
                    onChange={(e) =>
                      setExerciseCategory(
                        e.target.value as ExerciseCategory | "",
                      )
                    }
                    className="th-input h-10 w-44 sm:w-52"
                  >
                    <option value="">All types</option>
                    {EXERCISE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="relative">
                <span className="sr-only">Search</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search"
                  className="th-input h-10 w-40 sm:w-52"
                />
              </label>
              <button
                type="button"
                className="th-btn-primary"
                onClick={openCreate}
              >
                {tab === "sessions"
                  ? "Create Session Template"
                  : tab === "exercises"
                    ? "Create Exercise"
                    : `+ ${active.createLabel}`}
              </button>
            </div>
          </div>

          {error ? (
            <p className="mb-3 text-sm text-[var(--th-danger)]" role="alert">
              {error}
            </p>
          ) : null}
          {toast ? (
            <p
              className="mb-3 rounded-sm border border-[#86efac] bg-[#f0fdf4] px-3 py-2 text-sm font-medium text-[#166534]"
              role="status"
            >
              {toast}
            </p>
          ) : null}

          {tab === "exercises" ? (
            <LibraryTable
              headers={[
                "Title",
                "Category",
                "Video",
                "Points of Performance",
                "Created",
              ]}
              empty={
                exerciseCategory || search.trim()
                  ? "No exercises match this type / search."
                  : "No exercises yet. Create one to start your library."
              }
              rows={filteredExercises.map((ex) => ({
                id: ex.id,
                cells: [
                  ex.title,
                  ex.category,
                  ex.videoSource === "none" ? "—" : ex.videoSource,
                  truncate(ex.pointsOfPerformance, 48) || "—",
                  ex.createdAt.slice(0, 10),
                ],
                selected: selectedIds.includes(ex.id),
                onToggle: () => toggleSelect(ex.id),
                onEdit: () => setExerciseDrawer({ mode: "edit", id: ex.id }),
                onDelete: () => void deleteOne(ex.id),
              }))}
            />
          ) : null}

          {tab === "sessions" ? (
            <LibraryTable
              headers={[
                "Title",
                "Created By",
                "Blocks",
                "Date Created",
              ]}
              empty="No sessions yet. Create a session template."
              rows={filteredWorkouts.map((w) => {
                const blockCount = workoutBlocks.filter(
                  (b) => b.workoutId === w.id,
                ).length;
                return {
                  id: w.id,
                  cells: [
                    w.title,
                    "Coach",
                    String(blockCount),
                    w.createdAt.slice(0, 10),
                  ],
                  selected: selectedIds.includes(w.id),
                  onToggle: () => toggleSelect(w.id),
                  onEdit: () => openEditSession(w.id),
                  onDelete: () => void deleteOne(w.id),
                };
              })}
            />
          ) : null}

          {tab === "programs" ? (
            <LibraryTable
              headers={["Title", "Type", "Weeks", "Created"]}
              empty="No programs yet. Create a multi-week program."
              rows={filteredPrograms.map((p) => ({
                id: p.id,
                cells: [
                  p.title,
                  <TypeBadge key="t" label="Program" />,
                  `${p.weeks} weeks`,
                  p.createdAt.slice(0, 10),
                ],
                selected: selectedIds.includes(p.id),
                onToggle: () => toggleSelect(p.id),
                onEdit: () => openEditProgram(p.id),
                onDelete: () => void deleteOne(p.id),
              }))}
            />
          ) : null}

          <ExerciseFormDrawer
            open={exerciseDrawer != null}
            mode={exerciseDrawer?.mode === "edit" ? "edit" : "create"}
            exercise={
              exerciseDrawer?.mode === "edit"
                ? (mergedExercises.find((e) => e.id === exerciseDrawer.id) ??
                  null)
                : null
            }
            onClose={() => setExerciseDrawer(null)}
            onSaved={(ex) => {
              setLocalExercises((prev) => [
                ex,
                ...prev.filter((e) => e.id !== ex.id),
              ]);
              setExerciseCategory("");
              setSearch("");
              setToast(`Saved “${ex.title}” — it’s at the top of your list.`);
            }}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {error ? (
            <p className="text-sm text-[var(--th-danger)]" role="alert">
              {error}
            </p>
          ) : null}
          {tab === "sessions" ? (
            <WorkoutsManager
              workouts={workouts}
              blocks={workoutBlocks}
              exercises={mergedExercises}
              startFresh={creatingSession}
              focusWorkoutId={editingSessionId}
              onBack={backToList}
              onSaved={(id) => {
                setCreatingSession(false);
                setEditingSessionId(id);
              }}
            />
          ) : null}
          {tab === "programs" ? (
            <ProgramGridManager
              programs={mergedPrograms}
              programDays={programDays}
              workouts={workouts}
              workoutBlocks={workoutBlocks}
              exercises={mergedExercises}
              initialProgramId={editingProgramId}
              startInCreate={creatingProgram}
              onBackToList={backToList}
              onProgramCreated={(program) => {
                setCreatingProgram(false);
                setEditingProgramId(program.id);
                setLocalPrograms((prev) => [
                  program,
                  ...prev.filter((p) => p.id !== program.id),
                ]);
              }}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function truncate(value: string, max: number) {
  const t = value.trim();
  if (!t) return "";
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function TypeBadge({ label }: { label: string }) {
  return (
    <span className="inline-block rounded border border-[var(--th-border)] px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase th-muted">
      {label}
    </span>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 7h14M10 11v6M14 11v6M8 7V5h8v2M7 7l1 12h8l1-12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type TableRow = {
  headers: string[];
  empty: string;
  rows: Array<{
    id: string;
    cells: ReactNode[];
    selected: boolean;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
  }>;
};


function LibraryTable({
  headers,
  empty,
  rows,
}: {
  headers: string[];
  empty: string;
  rows: Array<{
    id: string;
    cells: ReactNode[];
    selected: boolean;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
  }>;
}) {
  if (rows.length === 0) {
    return (
      <div className="border border-dashed border-[var(--th-border)] bg-[var(--th-surface-muted)] px-4 py-12 text-center text-sm th-muted">
        {empty}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-[var(--th-border)]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[var(--th-surface-muted)] text-xs font-semibold uppercase tracking-wide th-muted">
          <tr>
            <th className="w-10 px-3 py-3">
              <span className="sr-only">Select</span>
            </th>
            {headers.map((h) => (
              <th key={h} className="px-3 py-3 font-semibold">
                {h}
              </th>
            ))}
            <th className="px-3 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-t border-[var(--th-border)] bg-white hover:bg-[var(--th-surface-muted)]/60"
            >
              <td className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={row.selected}
                  onChange={row.onToggle}
                  aria-label="Select row"
                />
              </td>
              {row.cells.map((cell, i) => (
                <td key={i} className="px-3 py-3 text-[var(--th-text)]">
                  {cell}
                </td>
              ))}
              <td className="px-3 py-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={row.onEdit}
                    className="th-link"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={row.onDelete}
                    className="text-xs font-semibold uppercase tracking-wide text-[var(--th-danger)]"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
