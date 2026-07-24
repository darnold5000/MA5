"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useServerRefresh } from "@/hooks/use-server-refresh";

import {
  EXERCISE_CATEGORIES,
  type ExerciseCategory,
} from "@/features/programs/exercise-library";
import type { Exercise, ExerciseParam } from "@/features/programs/types";
import { uploadExerciseVideoFromBrowser } from "@/lib/video/browser-upload";
import { VideoPlayer } from "@/lib/video/player";

const PARAM_OPTIONS: { value: ExerciseParam; label: string }[] = [
  { value: "reps", label: "Reps" },
  { value: "weight_lb", label: "Weight (lb)" },
];

const inputClass = "th-input text-sm";

const MAX_VIDEO_MB = 500;

type Props = {
  open: boolean;
  mode: "create" | "edit";
  exercise?: Exercise | null;
  onClose: () => void;
  onSaved?: (exercise: Exercise) => void;
};

export function ExerciseFormDrawer({
  open,
  mode,
  exercise,
  onClose,
  onSaved,
}: Props) {
  const { router, refresh, isRefreshing } = useServerRefresh();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ExerciseCategory | "">("");
  const [param1, setParam1] = useState<ExerciseParam | "">("");
  const [param2, setParam2] = useState<ExerciseParam | "">("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [cues, setCues] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);
    setPending(false);
    setVideoFile(null);
    if (mode === "edit" && exercise) {
      setTitle(exercise.title);
      setCategory(exercise.category);
      setParam1(exercise.defaultParam1);
      setParam2(exercise.defaultParam2);
      setVideoUrl(exercise.videoUrl ?? "");
      setCues(exercise.pointsOfPerformance);
      return;
    }
    setTitle("");
    setCategory("");
    setParam1("");
    setParam2("");
    setVideoUrl("");
    setCues("");
  }, [open, mode, exercise]);

  useEffect(() => {
    if (!videoFile) {
      setLocalPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(videoFile);
    setLocalPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function uploadVideo(exerciseId: string, file: File) {
    // Direct to Supabase Storage — not through Vercel (avoids 413).
    const uploaded = await uploadExerciseVideoFromBrowser({
      exerciseId,
      file,
    });
    if ("error" in uploaded) {
      throw new Error(uploaded.error);
    }
    const res = await fetch("/api/admin/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "attachExerciseVideo",
        id: exerciseId,
        storagePath: uploaded.path,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Could not attach video");
    }
    return data.exercise as Exercise;
  }

  async function save() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (videoFile && videoFile.size > MAX_VIDEO_MB * 1024 * 1024) {
      setError(`Video must be ${MAX_VIDEO_MB}MB or smaller.`);
      return;
    }

    setPending(true);
    setError(null);

    try {
      // If uploading a file, don't also send a URL (upload wins)
      const urlToSave = videoFile ? undefined : videoUrl.trim() || undefined;

      const body =
        mode === "create"
          ? {
              action: "createExercise",
              title: title.trim(),
              ...(category ? { category } : {}),
              ...(param1 ? { defaultParam1: param1 } : {}),
              ...(param2 ? { defaultParam2: param2 } : {}),
              pointsOfPerformance: cues,
              videoUrl: urlToSave,
            }
          : {
              action: "updateExercise",
              id: exercise!.id,
              title: title.trim(),
              ...(category ? { category } : {}),
              ...(param1 ? { defaultParam1: param1 } : {}),
              ...(param2 ? { defaultParam2: param2 } : {}),
              pointsOfPerformance: cues,
              ...(videoFile
                ? {}
                : { videoUrl: urlToSave ?? null }),
            };

      const res = await fetch("/api/admin/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Request failed");
      }

      let saved = data.exercise as Exercise;
      if (videoFile && saved?.id) {
        saved = await uploadVideo(saved.id, videoFile);
      }

      onClose();
      onSaved?.(saved);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setPending(false);
    }
  }

  const canSave = Boolean(title.trim()) && !pending;
  const hasExistingUpload =
    mode === "edit" &&
    exercise?.videoSource === "upload" &&
    Boolean(exercise.demoPlaybackUrl || exercise.videoStoragePath);

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-drawer-title"
        className="programs-th relative flex h-full w-full max-w-md flex-col bg-[var(--th-surface)] text-[var(--th-text)] shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-[#e5e7eb] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="text-[#6b7280] hover:text-[#111827]"
            aria-label="Close drawer"
          >
            <CloseIcon />
          </button>
          <h2
            id="exercise-drawer-title"
            className="text-base font-semibold text-[#111827]"
          >
            {mode === "create" ? "Create Exercise" : "Edit Exercise"}
          </h2>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6">
          <Field label="Title" hint={!title.trim() ? "Required" : undefined}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              autoFocus
            />
          </Field>

          <Field label="Category">
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as ExerciseCategory | "")
              }
              className={inputClass}
            >
              <option value="">Select category</option>
              {EXERCISE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#111827]">
              Default Parameters
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Parameter 1">
                <select
                  value={param1}
                  onChange={(e) =>
                    setParam1(e.target.value as ExerciseParam | "")
                  }
                  className={inputClass}
                >
                  <option value="">Select</option>
                  {PARAM_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Parameter 2">
                <select
                  value={param2}
                  onChange={(e) =>
                    setParam2(e.target.value as ExerciseParam | "")
                  }
                  className={inputClass}
                >
                  <option value="">Select</option>
                  {PARAM_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#111827]">Video</p>

            <Field label="Upload video">
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                disabled={pending}
                className="block w-full text-sm text-[#111827] file:mr-3 file:border-0 file:bg-[#2563eb] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setVideoFile(file);
                  if (file) setVideoUrl("");
                  setError(null);
                }}
              />
              <span className="mt-1 block text-xs text-[#9ca3af]">
                MP4, WebM, or MOV · max {MAX_VIDEO_MB}MB
                {videoFile ? ` · Selected: ${videoFile.name}` : ""}
              </span>
            </Field>

            <p className="text-center text-xs font-semibold tracking-wide text-[#9ca3af] uppercase">
              or
            </p>

            <Field label="YouTube / Vimeo URL">
              <input
                value={videoUrl}
                onChange={(e) => {
                  setVideoUrl(e.target.value);
                  if (e.target.value.trim()) setVideoFile(null);
                }}
                disabled={pending || Boolean(videoFile)}
                className={`${inputClass} disabled:bg-[#f9fafb] disabled:text-[#9ca3af]`}
                placeholder="Enter a youtube or vimeo url"
              />
            </Field>

            <div className="overflow-hidden rounded border border-[#e5e7eb] bg-[#f9fafb]">
              {localPreviewUrl ? (
                <video
                  className="aspect-video w-full"
                  controls
                  playsInline
                  src={localPreviewUrl}
                />
              ) : hasExistingUpload ? (
                <VideoPlayer
                  videoSource="upload"
                  playbackUrl={exercise?.demoPlaybackUrl}
                  title={title || "Exercise"}
                  className="aspect-video"
                />
              ) : videoUrl.trim() ? (
                <VideoPlayer
                  videoSource={
                    videoUrl.includes("vimeo") ? "vimeo" : "youtube"
                  }
                  videoUrl={videoUrl}
                  title={title || "Exercise"}
                  className="aspect-video"
                />
              ) : (
                <div className="flex h-36 items-center justify-center text-sm text-[#9ca3af]">
                  No Video
                </div>
              )}
            </div>
          </div>

          <Field label="Points of Performance">
            <textarea
              value={cues}
              onChange={(e) => setCues(e.target.value)}
              rows={5}
              maxLength={5000}
              className={`${inputClass} min-h-[7rem] resize-y`}
              placeholder="Ex. Stay tight. Attack each rep!"
            />
            <span className="mt-1 block text-right text-xs text-[#9ca3af]">
              {cues.length}/5000
            </span>
          </Field>

          {error ? (
            <p className="text-sm text-[var(--th-danger)]" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-[#e5e7eb] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-[#2563eb] hover:underline"
            disabled={pending}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={() => void save()}
            className="rounded-sm bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white disabled:bg-[#9ca3af]"
          >
            {pending
              ? videoFile
                ? "Uploading…"
                : "Saving…"
              : mode === "create"
                ? "Save Exercise"
                : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-semibold text-[#111827]">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-[#9ca3af]">{hint}</span> : null}
    </label>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
