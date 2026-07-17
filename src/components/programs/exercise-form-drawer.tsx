"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import {
  EXERCISE_CATEGORIES,
  type ExerciseCategory,
} from "@/features/programs/exercise-library";
import type { Exercise, ExerciseParam } from "@/features/programs/types";

const PARAM_OPTIONS: { value: ExerciseParam; label: string }[] = [
  { value: "reps", label: "Reps" },
  { value: "weight_lb", label: "Weight (lb)" },
];

const inputClass =
  "w-full border border-[#d1d5db] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#2563eb] focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0";

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
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ExerciseCategory | "">("");
  const [param1, setParam1] = useState<ExerciseParam | "">("");
  const [param2, setParam2] = useState<ExerciseParam | "">("");
  const [videoUrl, setVideoUrl] = useState("");
  const [cues, setCues] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);
    setPending(false);
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
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function save() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setPending(true);
    setError(null);
    const body =
      mode === "create"
        ? {
            action: "createExercise",
            title: title.trim(),
            ...(category ? { category } : {}),
            ...(param1 ? { defaultParam1: param1 } : {}),
            ...(param2 ? { defaultParam2: param2 } : {}),
            pointsOfPerformance: cues,
            videoUrl: videoUrl.trim() || undefined,
          }
        : {
            action: "updateExercise",
            id: exercise!.id,
            title: title.trim(),
            ...(category ? { category } : {}),
            ...(param1 ? { defaultParam1: param1 } : {}),
            ...(param2 ? { defaultParam2: param2 } : {}),
            pointsOfPerformance: cues,
            videoUrl: videoUrl.trim() || undefined,
          };

    const res = await fetch("/api/admin/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Request failed");
      return;
    }
    if (data.exercise) {
      onSaved?.(data.exercise as Exercise);
    }
    router.refresh();
    onClose();
  }

  const canSave = Boolean(title.trim()) && !pending;

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
        className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
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

          <Field label="Video">
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className={inputClass}
              placeholder="Enter a youtube or vimeo url"
            />
            <div className="mt-3 flex h-36 items-center justify-center rounded border border-dashed border-[#d1d5db] bg-[#f9fafb] text-sm text-[#9ca3af]">
              {videoUrl.trim() ? "Video URL entered" : "No Video"}
            </div>
          </Field>

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
            <p className="text-sm text-[#dc2626]" role="alert">
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
              ? "Saving…"
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
