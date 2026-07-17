"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const [title, setTitle] = useState("");
  const [cues, setCues] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [editCues, setEditCues] = useState("");
  const [editUrl, setEditUrl] = useState("");

  const selected = exercises.find((e) => e.id === selectedId) ?? null;

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

  async function createExercise() {
    const data = await post({
      action: "createExercise",
      title,
      pointsOfPerformance: cues,
      videoUrl: videoUrl || undefined,
    });
    if (data?.exercise) {
      setSelectedId(data.exercise.id);
      setTitle("");
      setCues("");
      setVideoUrl("");
    }
  }

  async function saveSelected() {
    if (!selected) return;
    await post({
      action: "updateExercise",
      id: selected.id,
      pointsOfPerformance: editCues || selected.pointsOfPerformance,
      videoUrl: editUrl || selected.videoUrl,
    });
  }

  async function uploadFile(file: File) {
    if (!selected) return;
    setPending(true);
    setError(null);
    const form = new FormData();
    form.set("exerciseId", selected.id);
    form.set("file", file);
    const res = await fetch("/api/admin/programs", {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Upload failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <div className="border border-border bg-surface p-5">
          <h2 className="font-display text-xl tracking-wide uppercase">
            Create exercise
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
                placeholder="Back Squat"
              />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-xs font-semibold tracking-wide uppercase">
                Points of performance
              </span>
              <textarea
                value={cues}
                onChange={(e) => setCues(e.target.value)}
                rows={3}
                className="w-full border border-border bg-background px-3 py-2"
                placeholder="Proper form cues for this movement"
              />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-xs font-semibold tracking-wide uppercase">
                YouTube / Vimeo URL (optional)
              </span>
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="min-h-11 w-full border border-border bg-background px-3"
                placeholder="https://youtu.be/…"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={pending || !title.trim()}
            onClick={createExercise}
            className="mt-4 inline-flex min-h-11 items-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50"
          >
            Save exercise
          </button>
        </div>

        <div className="space-y-2">
          {exercises.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => {
                setSelectedId(ex.id);
                setEditCues(ex.pointsOfPerformance);
                setEditUrl(ex.videoUrl ?? "");
              }}
              className={`flex w-full items-center justify-between border px-4 py-3 text-left transition ${
                selectedId === ex.id
                  ? "border-brand bg-brand/10"
                  : "border-border bg-surface hover:border-brand/50"
              }`}
            >
              <div>
                <p className="font-display text-lg tracking-wide uppercase">
                  {ex.title}
                </p>
                <p className="text-xs text-muted">
                  Video: {ex.videoSource === "none" ? "none" : ex.videoSource}
                </p>
              </div>
              <span className="text-xs font-semibold tracking-wide text-brand uppercase">
                Edit
              </span>
            </button>
          ))}
        </div>
      </div>

      <aside className="border border-border bg-surface p-5 lg:sticky lg:top-6 lg:self-start">
        {selected ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                View exercise
              </p>
              <h3 className="mt-1 font-display text-2xl tracking-wide uppercase">
                {selected.title}
              </h3>
            </div>
            <VideoPlayer
              videoSource={selected.videoSource}
              videoUrl={selected.videoUrl}
              playbackUrl={selected.demoPlaybackUrl}
              title={selected.title}
            />
            <label className="block space-y-1 text-sm">
              <span className="text-xs font-semibold tracking-wide uppercase">
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
                className="block w-full text-xs text-muted file:mr-3 file:border-0 file:bg-brand file:px-3 file:py-2 file:text-xs file:font-semibold file:tracking-wide file:text-brand-foreground file:uppercase"
              />
              <span className="block text-xs text-muted">
                Without Supabase Storage, demo mode uses a sample playback file.
              </span>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-xs font-semibold tracking-wide uppercase">
                Or paste YouTube / Vimeo
              </span>
              <input
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                className="min-h-11 w-full border border-border bg-background px-3"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-xs font-semibold tracking-wide uppercase">
                Points of performance
              </span>
              <textarea
                value={editCues || selected.pointsOfPerformance}
                onChange={(e) => setEditCues(e.target.value)}
                rows={5}
                className="w-full border border-border bg-background px-3 py-2"
              />
            </label>
            <button
              type="button"
              disabled={pending}
              onClick={saveSelected}
              className="inline-flex min-h-11 w-full items-center justify-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50"
            >
              Save changes
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted">Select an exercise to edit.</p>
        )}
        {error ? (
          <p className="mt-3 text-sm text-brand" role="alert">
            {error}
          </p>
        ) : null}
      </aside>
    </div>
  );
}
