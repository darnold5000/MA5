"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ExercisePicker } from "@/components/programs/exercise-picker";
import {
  EXERCISE_CATEGORIES,
  type ExerciseCategory,
} from "@/features/programs/exercise-library";
import type { Exercise } from "@/features/programs/types";
import { VideoPlayer } from "@/lib/video/player";

type Props = {
  exercises: Exercise[];
};

export function ExercisesManager({ exercises }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    exercises[0]?.id ?? null,
  );
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ExerciseCategory>("Legs");
  const [cues, setCues] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState<ExerciseCategory>("Legs");
  const [editCues, setEditCues] = useState("");
  const [editUrl, setEditUrl] = useState("");

  const selected = exercises.find((e) => e.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) return;
    setEditTitle(selected.title);
    setEditCategory(selected.category);
    setEditCues(selected.pointsOfPerformance);
    setEditUrl(selected.videoUrl ?? "");
  }, [selected]);

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

  function selectExercise(ex: Exercise) {
    setSelectedId(ex.id);
    setCreating(false);
  }

  async function uploadFile(file: File) {
    if (!selected) return;
    setPending(true);
    setError(null);
    const form = new FormData();
    form.set("exerciseId", selected.id);
    form.set("file", file);
    const res = await fetch("/api/admin/programs", { method: "POST", body: form });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Upload failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm th-muted">
          Generic library ({exercises.length} movements) with category filters.
          Add video + form cues here; program sets &amp; reps in Sessions.
        </p>
        <button
          type="button"
          className="th-btn-primary"
          onClick={() => {
            setCreating(true);
            setSelectedId(null);
          }}
        >
          + Create exercise
        </button>
      </div>

      <div className="th-card">
        <div className="border-b border-[var(--th-border)] p-3">
          <ExercisePicker
            exercises={exercises}
            value={selected?.id ?? exercises[0]?.id ?? ""}
            onChange={(id) => {
              const ex = exercises.find((x) => x.id === id);
              if (ex) selectExercise(ex);
            }}
          />
        </div>

        {creating ? (
          <div className="space-y-3 border-t border-[var(--th-border)] p-5">
            <h3 className="font-bold">New exercise</h3>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="th-input"
              placeholder="Title"
            />
            <label className="block space-y-1 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide th-muted">
                Category
              </span>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as ExerciseCategory)
                }
                className="th-input"
              >
                {EXERCISE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <textarea
              value={cues}
              onChange={(e) => setCues(e.target.value)}
              rows={3}
              className="th-input min-h-[5rem]"
              placeholder="Points of performance"
            />
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="th-input"
              placeholder="YouTube / Vimeo URL (optional)"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending || !title.trim()}
                className="th-btn-primary"
                onClick={async () => {
                  const data = await post({
                    action: "createExercise",
                    title,
                    category,
                    pointsOfPerformance: cues,
                    videoUrl: videoUrl || undefined,
                  });
                  if (data?.exercise) {
                    selectExercise(data.exercise);
                    setTitle("");
                    setCues("");
                    setVideoUrl("");
                  }
                }}
              >
                Save exercise
              </button>
              <button
                type="button"
                className="th-btn-ghost"
                onClick={() => setCreating(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : selected ? (
          <div className="grid gap-0 border-t border-[var(--th-border)] lg:grid-cols-[1.2fr_0.9fr]">
            <div className="space-y-4 border-b border-[var(--th-border)] p-5 lg:border-r lg:border-b-0">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="th-input text-lg font-semibold"
              />
              <label className="block space-y-1 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide th-muted">
                  Category
                </span>
                <select
                  value={editCategory}
                  onChange={(e) =>
                    setEditCategory(e.target.value as ExerciseCategory)
                  }
                  className="th-input"
                >
                  {EXERCISE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide th-muted">
                  Points of performance
                </span>
                <textarea
                  value={editCues}
                  onChange={(e) => setEditCues(e.target.value)}
                  rows={4}
                  className="th-input min-h-[6rem]"
                />
              </label>
              <div className="overflow-hidden rounded border border-[var(--th-border)] bg-black">
                <VideoPlayer
                  videoSource={selected.videoSource}
                  videoUrl={selected.videoUrl}
                  playbackUrl={selected.demoPlaybackUrl}
                  title={selected.title}
                  className="aspect-video"
                />
              </div>
              <label className="block space-y-1 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide th-muted">
                  Upload native video
                </span>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  disabled={pending}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadFile(file);
                  }}
                  className="block w-full text-xs th-muted file:mr-3 file:border-0 file:bg-[var(--th-blue)] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white file:uppercase"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide th-muted">
                  Or YouTube / Vimeo URL
                </span>
                <input
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="th-input"
                />
              </label>
            </div>

            <div className="space-y-4 p-5">
              <div className="th-bar px-3 py-2">
                <p className="text-sm font-semibold">Default prescription</p>
                <p className="mt-1 text-xs th-muted">
                  Defaults for this movement. Actual sets &amp; reps are set per
                  workout block on the Sessions tab.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="th-bar px-3 py-3">
                  <p className="text-xs font-semibold uppercase th-muted">
                    Param 1
                  </p>
                  <p className="mt-1 font-semibold">Reps</p>
                </div>
                <div className="th-bar px-3 py-3">
                  <p className="text-xs font-semibold uppercase th-muted">
                    Param 2
                  </p>
                  <p className="mt-1 font-semibold">Weight (lb)</p>
                </div>
              </div>
              <button
                type="button"
                disabled={pending}
                className="th-btn-primary w-full"
                onClick={() =>
                  post({
                    action: "updateExercise",
                    id: selected.id,
                    title: editTitle || selected.title,
                    category: editCategory,
                    pointsOfPerformance:
                      editCues || selected.pointsOfPerformance,
                    videoUrl: editUrl || selected.videoUrl,
                  })
                }
              >
                Save changes
              </button>
            </div>
          </div>
        ) : (
          <p className="p-5 text-sm th-muted">No exercises yet. Create one.</p>
        )}
      </div>

      {error ? (
        <p className="text-sm text-[var(--th-danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
