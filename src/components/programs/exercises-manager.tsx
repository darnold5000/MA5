"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Exercise } from "@/features/programs/types";
import { VideoPlayer } from "@/lib/video/player";

type Props = {
  exercises: Exercise[];
};

type VideoFilter = "all" | "with-video" | "no-video";

export function ExercisesManager({ exercises }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    exercises[0]?.id ?? null,
  );
  const [filter, setFilter] = useState<VideoFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [cues, setCues] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editCues, setEditCues] = useState("");
  const [editUrl, setEditUrl] = useState("");

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      if (filter === "with-video") return ex.videoSource !== "none";
      if (filter === "no-video") return ex.videoSource === "none";
      return true;
    });
  }, [exercises, filter]);

  const selected =
    exercises.find((e) => e.id === selectedId) ?? filtered[0] ?? null;

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
    setEditTitle(ex.title);
    setEditCues(ex.pointsOfPerformance);
    setEditUrl(ex.videoUrl ?? "");
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
          Library of movements (video + form cues). To program sets &amp; reps,
          open <strong className="text-[var(--th-text)]">Workouts</strong> and
          add blocks.
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

      {/* TrainHeroic-style picker bar */}
      <div className="th-card">
        <div className="th-bar flex items-center gap-2 px-3 py-2">
          <select
            value={selected?.id ?? ""}
            onChange={(e) => {
              const ex = exercises.find((x) => x.id === e.target.value);
              if (ex) selectExercise(ex);
            }}
            className="min-h-11 flex-1 border-0 bg-transparent text-base font-semibold outline-none"
          >
            {filtered.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title}
              </option>
            ))}
          </select>
          <div className="relative">
            <button
              type="button"
              aria-label="Filter exercises"
              onClick={() => setFilterOpen((o) => !o)}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded border border-[var(--th-border)] bg-white th-muted"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 6h16M7 12h10M10 18h4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
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

        {creating ? (
          <div className="space-y-3 border-t border-[var(--th-border)] p-5">
            <h3 className="font-bold">New exercise</h3>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="th-input"
              placeholder="Title"
            />
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
                value={editTitle || selected.title}
                onChange={(e) => setEditTitle(e.target.value)}
                className="th-input text-lg font-semibold"
              />
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide th-muted">
                  Points of performance
                </span>
                <textarea
                  value={editCues || selected.pointsOfPerformance}
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
                  workout block on the Workouts tab.
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
              <p className="text-xs th-muted">
                Tip: open <strong>Workouts</strong>, add this exercise as a
                block, then edit the sets table beside the video — same layout as
                TrainHeroic.
              </p>
              <button
                type="button"
                disabled={pending}
                className="th-btn-primary w-full"
                onClick={() =>
                  post({
                    action: "updateExercise",
                    id: selected.id,
                    title: editTitle || selected.title,
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
