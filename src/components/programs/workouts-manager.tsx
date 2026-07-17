"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Exercise, Workout, WorkoutBlock } from "@/features/programs/types";
import { VideoPlayer } from "@/lib/video/player";

type Props = {
  workouts: Workout[];
  blocks: WorkoutBlock[];
  exercises: Exercise[];
};

export function WorkoutsManager({ workouts, blocks, exercises }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    workouts[0]?.id ?? null,
  );
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [exerciseId, setExerciseId] = useState(exercises[0]?.id ?? "");

  const selected = workouts.find((w) => w.id === selectedId) ?? null;
  const selectedBlocks = useMemo(
    () =>
      blocks
        .filter((b) => b.workoutId === selectedId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [blocks, selectedId],
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
          Create workout
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="text-xs font-semibold tracking-wide uppercase">
              Title
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="min-h-11 w-full border border-border bg-background px-3"
              placeholder="Upper Body Strength"
            />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="text-xs font-semibold tracking-wide uppercase">
              Coach instructions
            </span>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              className="w-full border border-border bg-background px-3 py-2"
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
          className="mt-4 inline-flex min-h-11 items-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50"
        >
          Save workout
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <div className="space-y-2">
          {workouts.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setSelectedId(w.id)}
              className={`block w-full border px-3 py-3 text-left ${
                selectedId === w.id
                  ? "border-brand bg-brand/10"
                  : "border-border bg-surface"
              }`}
            >
              <span className="font-display text-sm tracking-wide uppercase">
                {w.title}
              </span>
            </button>
          ))}
        </div>

        {selected ? (
          <div className="space-y-4 border border-border bg-surface p-5">
            <div>
              <h3 className="font-display text-2xl tracking-wide uppercase">
                {selected.title}
              </h3>
              <p className="mt-2 text-sm text-muted">
                {selected.coachInstructions || "No coach instructions yet."}
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-3 border border-border bg-background p-3">
              <label className="min-w-[200px] flex-1 space-y-1 text-sm">
                <span className="text-xs font-semibold tracking-wide uppercase">
                  Add block from library
                </span>
                <select
                  value={exerciseId}
                  onChange={(e) => setExerciseId(e.target.value)}
                  className="min-h-11 w-full border border-border bg-surface px-3"
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
                className="inline-flex min-h-11 items-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50"
              >
                Add block
              </button>
            </div>

            <div className="space-y-3">
              {selectedBlocks.map((block) => {
                const exercise =
                  exercises.find((e) => e.id === block.exerciseId) ?? null;
                return (
                  <article
                    key={block.id}
                    className="border border-border bg-background p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold tracking-wide text-brand uppercase">
                          {block.label}
                          {block.sectionTitle ? ` · ${block.sectionTitle}` : ""}
                        </p>
                        <h4 className="font-display text-xl tracking-wide uppercase">
                          {exercise?.title ?? "Exercise"}
                        </h4>
                        <p className="mt-1 text-sm text-muted">
                          {block.sets
                            .map(
                              (s) =>
                                `${s.reps ?? "–"}${s.weightLb != null ? ` @ ${s.weightLb}lb` : ""}`,
                            )
                            .join(" · ")}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          post({ action: "removeBlock", id: block.id })
                        }
                        className="text-xs font-semibold tracking-wide text-muted uppercase hover:text-brand"
                      >
                        Remove
                      </button>
                    </div>
                    {exercise ? (
                      <div className="mt-3 max-w-md">
                        <VideoPlayer
                          videoSource={exercise.videoSource}
                          videoUrl={exercise.videoUrl}
                          playbackUrl={exercise.demoPlaybackUrl}
                          title={exercise.title}
                        />
                        {exercise.pointsOfPerformance ? (
                          <p className="mt-2 text-xs text-muted">
                            {exercise.pointsOfPerformance}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    {block.sessionCues ? (
                      <p className="mt-2 text-sm">{block.sessionCues}</p>
                    ) : null}
                  </article>
                );
              })}
              {selectedBlocks.length === 0 ? (
                <p className="text-sm text-muted">
                  No blocks yet. Add exercises from the library.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-brand" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
