"use client";

import { useMemo, useState } from "react";

import type {
  Exercise,
  WorkoutBlock,
  WorkoutBlockSet,
} from "@/features/programs/types";
import { VideoPlayer } from "@/lib/video/player";

export type VideoFilter = "all" | "with-video" | "no-video";

type ExerciseBlockCardProps = {
  block: WorkoutBlock;
  exercises: Exercise[];
  pending?: boolean;
  onChangeExercise: (exerciseId: string) => void;
  onChangeCues: (cues: string) => void;
  onChangeSets: (sets: WorkoutBlockSet[]) => void;
  onSaveSets: (sets: WorkoutBlockSet[]) => void;
  onRemove: () => void;
};

export function ExerciseBlockCard({
  block,
  exercises,
  pending,
  onChangeExercise,
  onChangeCues,
  onChangeSets,
  onSaveSets,
  onRemove,
}: ExerciseBlockCardProps) {
  const [filter, setFilter] = useState<VideoFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [param2, setParam2] = useState<"weight_lb" | "optional">("weight_lb");

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      if (filter === "with-video") return ex.videoSource !== "none";
      if (filter === "no-video") return ex.videoSource === "none";
      return true;
    });
  }, [exercises, filter]);

  const exercise =
    exercises.find((e) => e.id === block.exerciseId) ??
    filtered.find((e) => e.id === block.exerciseId) ??
    null;

  const sets = block.sets.length
    ? block.sets
    : [{ setNumber: 1, reps: 8, weightLb: null }];

  function updateSet(
    index: number,
    patch: Partial<WorkoutBlockSet>,
  ) {
    const next = sets.map((s, i) =>
      i === index ? { ...s, ...patch, setNumber: i + 1 } : { ...s, setNumber: i + 1 },
    );
    onChangeSets(next);
  }

  function addSet() {
    const next = [
      ...sets,
      {
        setNumber: sets.length + 1,
        reps: sets[sets.length - 1]?.reps ?? 8,
        weightLb: null,
      },
    ];
    onChangeSets(next);
  }

  function removeSet() {
    if (sets.length <= 1) return;
    const next = sets.slice(0, -1).map((s, i) => ({ ...s, setNumber: i + 1 }));
    onChangeSets(next);
  }

  return (
    <article className="th-card overflow-hidden">
      <div className="th-bar flex items-center justify-between gap-3 px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: "var(--th-blue)" }}
          >
            {block.label}
          </span>
          <span className="text-sm font-semibold th-muted">
            {block.sectionTitle ?? "Block"}
          </span>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={onRemove}
          className="text-xs font-semibold uppercase tracking-wide th-muted hover:text-[var(--th-danger)]"
        >
          Remove
        </button>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.2fr_0.9fr]">
        {/* Left: exercise picker + media + cues */}
        <div className="border-b border-[var(--th-border)] p-4 lg:border-r lg:border-b-0">
          <div className="th-bar flex items-center gap-2 px-2 py-1.5">
            <select
              value={block.exerciseId}
              disabled={pending}
              onChange={(e) => onChangeExercise(e.target.value)}
              className="min-h-10 flex-1 border-0 bg-transparent text-base font-semibold text-[var(--th-text)] outline-none"
            >
              {filtered.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title}
                </option>
              ))}
              {/* Keep current selected even if filtered out */}
              {exercise &&
              !filtered.some((e) => e.id === exercise.id) ? (
                <option value={exercise.id}>{exercise.title}</option>
              ) : null}
            </select>
            <div className="relative">
              <button
                type="button"
                aria-label="Filter exercises"
                aria-expanded={filterOpen}
                onClick={() => setFilterOpen((o) => !o)}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded border border-[var(--th-border)] bg-white text-[var(--th-muted)] hover:text-[var(--th-text)]"
              >
                <FilterIcon />
                {filter !== "all" ? (
                  <span
                    className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                    style={{ background: "var(--th-blue)" }}
                  >
                    1
                  </span>
                ) : null}
              </button>
              {filterOpen ? (
                <div className="absolute right-0 z-20 mt-1 w-44 border border-[var(--th-border)] bg-white py-1 shadow-md">
                  {(
                    [
                      ["all", "All exercises"],
                      ["with-video", "Has video"],
                      ["no-video", "No video"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`block w-full px-3 py-2 text-left text-sm ${
                        filter === value
                          ? "bg-[var(--th-surface-muted)] font-semibold"
                          : "hover:bg-[var(--th-surface-muted)]"
                      }`}
                      onClick={() => {
                        setFilter(value);
                        setFilterOpen(false);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <label className="mt-3 block">
            <span className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wide th-muted">
              Exercise instructions
              <span>{block.sessionCues.length}/10000</span>
            </span>
            <textarea
              value={block.sessionCues}
              disabled={pending}
              onChange={(e) => onChangeCues(e.target.value)}
              rows={2}
              placeholder="Add cues for this session."
              className="th-input min-h-[4.5rem] resize-y"
            />
          </label>

          <div className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr]">
            <div className="overflow-hidden rounded border border-[var(--th-border)] bg-black">
              {exercise ? (
                <VideoPlayer
                  videoSource={exercise.videoSource}
                  videoUrl={exercise.videoUrl}
                  playbackUrl={exercise.demoPlaybackUrl}
                  title={exercise.title}
                  className="aspect-video"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center text-xs text-white/70">
                  No video
                </div>
              )}
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide th-muted">
                  Points of performance
                </p>
                <p className="mt-1 text-[var(--th-text)]">
                  {exercise?.pointsOfPerformance?.trim() ||
                    "No points of performance."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: prescription */}
        <div className="p-4">
          <div className="th-bar flex items-center justify-between gap-2 px-3 py-2">
            <span className="text-sm font-semibold">
              {sets.length} Set{sets.length === 1 ? "" : "s"}
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={() => onSaveSets(sets)}
              className="th-link"
            >
              Save prescription
            </button>
          </div>

          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[240px] text-sm">
              <thead>
                <tr className="th-muted text-left text-xs uppercase tracking-wide">
                  <th className="px-1 py-2 font-semibold">Set</th>
                  <th className="px-1 py-2 font-semibold">Reps</th>
                  <th className="px-1 py-2 font-semibold">
                    <select
                      value={param2}
                      onChange={(e) =>
                        setParam2(e.target.value as "weight_lb" | "optional")
                      }
                      className="border-0 bg-transparent font-semibold uppercase outline-none"
                    >
                      <option value="weight_lb">Weight (lb)</option>
                      <option value="optional">Optional</option>
                    </select>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sets.map((set, i) => (
                  <tr key={set.setNumber} className="border-t border-[var(--th-border)]">
                    <td className="px-1 py-2 font-semibold th-muted">{i + 1}</td>
                    <td className="px-1 py-2">
                      <input
                        type="number"
                        min={0}
                        value={set.reps ?? ""}
                        disabled={pending}
                        onChange={(e) =>
                          updateSet(i, {
                            reps:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                          })
                        }
                        className="th-input min-h-9"
                      />
                    </td>
                    <td className="px-1 py-2">
                      {param2 === "weight_lb" ? (
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={set.weightLb ?? ""}
                          disabled={pending}
                          placeholder="—"
                          onChange={(e) =>
                            updateSet(i, {
                              weightLb:
                                e.target.value === ""
                                  ? null
                                  : Number(e.target.value),
                            })
                          }
                          className="th-input min-h-9"
                        />
                      ) : (
                        <span className="th-muted text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-center gap-3">
            <button
              type="button"
              aria-label="Remove set"
              disabled={pending || sets.length <= 1}
              onClick={removeSet}
              className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold text-white disabled:opacity-40"
              style={{ background: "var(--th-blue)" }}
            >
              −
            </button>
            <span className="text-xs font-semibold uppercase tracking-wide th-muted">
              Sets
            </span>
            <button
              type="button"
              aria-label="Add set"
              disabled={pending}
              onClick={addSet}
              className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold text-white disabled:opacity-40"
              style={{ background: "var(--th-blue)" }}
            >
              +
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16M7 12h10M10 18h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
