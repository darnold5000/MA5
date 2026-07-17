"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ExerciseBlockCard } from "@/components/programs/exercise-block-card";
import type {
  Exercise,
  Workout,
  WorkoutBlock,
  WorkoutBlockSet,
} from "@/features/programs/types";

type Props = {
  workouts: Workout[];
  blocks: WorkoutBlock[];
  exercises: Exercise[];
  /** Prefer this workout when opening (e.g. from program day). */
  focusWorkoutId?: string | null;
  /** Hide create form + workout list — day editor inside a program. */
  embedded?: boolean;
};

export function WorkoutsManager({
  workouts,
  blocks,
  exercises,
  focusWorkoutId = null,
  embedded = false,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    focusWorkoutId ?? workouts[0]?.id ?? null,
  );
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [exerciseId, setExerciseId] = useState(exercises[0]?.id ?? "");
  const [localBlocks, setLocalBlocks] = useState<WorkoutBlock[] | null>(null);

  useEffect(() => {
    if (focusWorkoutId) {
      setSelectedId(focusWorkoutId);
      setLocalBlocks(null);
    }
  }, [focusWorkoutId]);

  const selected = workouts.find((w) => w.id === selectedId) ?? null;
  const serverBlocks = useMemo(
    () =>
      blocks
        .filter((b) => b.workoutId === selectedId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [blocks, selectedId],
  );
  const selectedBlocks = localBlocks ?? serverBlocks;

  function syncLocal(next: WorkoutBlock[]) {
    setLocalBlocks(next);
  }

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
    setLocalBlocks(null);
    router.refresh();
    return data;
  }

  function patchBlockLocal(id: string, patch: Partial<WorkoutBlock>) {
    const base = localBlocks ?? serverBlocks;
    syncLocal(base.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  return (
    <div className="space-y-6">
      {!embedded ? (
        <div className="th-card p-5">
          <h2 className="text-lg font-bold text-[var(--th-text)]">Create workout</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide th-muted">
                Title
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="th-input"
                placeholder="Upper Body Strength"
              />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide th-muted">
                Coach instructions
              </span>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={2}
                className="th-input min-h-[4rem]"
                placeholder="Use this area to help the athlete understand goals for today's session."
              />
            </label>
          </div>
          <button
            type="button"
            disabled={pending || !title.trim()}
            onClick={async () => {
              const data = await post({
                action: "createWorkout",
                title,
                coachInstructions: instructions,
              });
              if (data?.workout) {
                setSelectedId(data.workout.id);
                setTitle("");
                setInstructions("");
              }
            }}
            className="th-btn-primary mt-4"
          >
            Save workout
          </button>
        </div>
      ) : null}

      <div
        className={
          embedded
            ? "space-y-4"
            : "grid gap-4 lg:grid-cols-[220px_1fr]"
        }
      >
        {!embedded ? (
          <div className="space-y-2">
            {workouts.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => {
                  setSelectedId(w.id);
                  setLocalBlocks(null);
                }}
                className={`block w-full border px-3 py-3 text-left text-sm font-semibold ${
                  selectedId === w.id
                    ? "border-[var(--th-blue)] bg-white text-[var(--th-blue)]"
                    : "border-[var(--th-border)] bg-white text-[var(--th-text)] hover:border-[var(--th-blue)]"
                }`}
              >
                {w.title}
              </button>
            ))}
          </div>
        ) : null}

        {selected ? (
          <div className="space-y-4">
            <div className="th-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {embedded ? (
                    <label className="block space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wide th-muted">
                        Session title
                      </span>
                      <input
                        key={selected.id}
                        defaultValue={selected.title}
                        className="th-input text-xl font-bold"
                        onBlur={(e) => {
                          const next = e.target.value.trim();
                          if (next && next !== selected.title) {
                            void post({
                              action: "updateWorkout",
                              id: selected.id,
                              title: next,
                            });
                          }
                        }}
                      />
                    </label>
                  ) : (
                    <>
                      <h3 className="text-2xl font-bold">{selected.title}</h3>
                      <p className="mt-1 text-sm th-muted">
                        Build blocks like TrainHeroic — pick an exercise, set reps,
                        publish later from Assign / Teams.
                      </p>
                    </>
                  )}
                </div>
              </div>

              <label className="mt-4 block">
                <span className="mb-1 flex justify-between text-xs font-semibold uppercase tracking-wide th-muted">
                  Coach instructions
                  <span>{selected.coachInstructions.length}/10000</span>
                </span>
                <textarea
                  defaultValue={selected.coachInstructions}
                  key={selected.id}
                  rows={2}
                  className="th-input min-h-[4rem]"
                  placeholder="Use this area to help the athlete understand goals for today's session."
                  onBlur={(e) => {
                    if (e.target.value !== selected.coachInstructions) {
                      void post({
                        action: "updateWorkout",
                        id: selected.id,
                        coachInstructions: e.target.value,
                      });
                    }
                  }}
                />
              </label>
            </div>

            <div className="th-card flex flex-wrap items-end gap-3 p-4">
              <label className="min-w-[220px] flex-1 space-y-1 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide th-muted">
                  Add exercise from library
                </span>
                <select
                  value={exerciseId}
                  onChange={(e) => setExerciseId(e.target.value)}
                  className="th-input"
                >
                  {exercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.title}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={pending || !exerciseId}
                onClick={() =>
                  post({
                    action: "addBlock",
                    workoutId: selected.id,
                    exerciseId,
                  })
                }
                className="th-btn-primary"
              >
                Add block
              </button>
            </div>

            <div className="space-y-4">
              {selectedBlocks.map((block) => (
                <ExerciseBlockCard
                  key={block.id}
                  block={block}
                  exercises={exercises}
                  pending={pending}
                  onChangeExercise={(id) => {
                    patchBlockLocal(block.id, { exerciseId: id });
                    void post({
                      action: "updateBlock",
                      id: block.id,
                      exerciseId: id,
                    });
                  }}
                  onChangeCues={(cues) =>
                    patchBlockLocal(block.id, { sessionCues: cues })
                  }
                  onChangeSets={(sets: WorkoutBlockSet[]) =>
                    patchBlockLocal(block.id, { sets })
                  }
                  onSaveSets={(sets) => {
                    const cues =
                      (localBlocks ?? serverBlocks).find((b) => b.id === block.id)
                        ?.sessionCues ?? block.sessionCues;
                    void post({
                      action: "updateBlock",
                      id: block.id,
                      sets,
                      sessionCues: cues,
                    });
                  }}
                  onRemove={() =>
                    post({ action: "removeBlock", id: block.id })
                  }
                />
              ))}
              {selectedBlocks.length === 0 ? (
                <p className="th-card p-5 text-sm th-muted">
                  No blocks yet. Add an exercise from the library dropdown.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-[var(--th-danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
