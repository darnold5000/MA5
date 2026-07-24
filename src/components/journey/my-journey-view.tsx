"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { buildTimeline } from "@/features/journey/timeline";
import type {
  JourneyTimelineEntry,
  MemberGoal,
  MemberJourneyData,
  ProgressPhoto,
} from "@/features/journey/types";
import { uploadJourneyPhotoFromBrowser } from "@/lib/assets/browser-upload";
import { cn } from "@/lib/utils";

type Tab = "goals" | "photos" | "timeline";

type MyJourneyViewProps = {
  userId: string;
  initialData: MemberJourneyData;
  demoMode?: boolean;
};

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border border-dashed border-border bg-surface px-6 py-10 text-center">
      <p className="font-display text-xl tracking-wide uppercase">{title}</p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
        {description}
      </p>
    </div>
  );
}

export function MyJourneyView({
  userId,
  initialData,
  demoMode = false,
}: MyJourneyViewProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("goals");
  const [goals, setGoals] = useState(initialData.goals);
  const [photos, setPhotos] = useState(initialData.photos);
  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTargetDate, setEditTargetDate] = useState("");
  const [caption, setCaption] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timeline = useMemo(
    () => buildTimeline(goals, photos),
    [goals, photos],
  );

  async function refresh() {
    router.refresh();
  }

  async function createGoal(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setPending(true);
    setError(null);
    setMessage(null);

    if (demoMode) {
      const goal: MemberGoal = {
        id: crypto.randomUUID(),
        title: title.trim(),
        targetDate: targetDate || null,
        status: "active",
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setGoals((current) => [goal, ...current]);
      setTitle("");
      setTargetDate("");
      setMessage("Goal added");
      setPending(false);
      return;
    }

    const res = await fetch("/api/journey/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        targetDate: targetDate || null,
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create goal");
      return;
    }
    setGoals((current) => [data.goal, ...current]);
    setTitle("");
    setTargetDate("");
    setMessage("Goal added");
    void refresh();
  }

  async function saveGoalEdit(goalId: string) {
    setPending(true);
    setError(null);

    if (demoMode) {
      setGoals((current) =>
        current.map((goal) =>
          goal.id === goalId
            ? {
                ...goal,
                title: editTitle.trim(),
                targetDate: editTargetDate || null,
                updatedAt: new Date().toISOString(),
              }
            : goal,
        ),
      );
      setEditingGoalId(null);
      setPending(false);
      return;
    }

    const res = await fetch("/api/journey/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goalId,
        title: editTitle.trim(),
        targetDate: editTargetDate || null,
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not update goal");
      return;
    }
    setGoals((current) =>
      current.map((goal) => (goal.id === goalId ? data.goal : goal)),
    );
    setEditingGoalId(null);
    void refresh();
  }

  async function toggleGoal(goal: MemberGoal) {
    const nextStatus = goal.status === "completed" ? "active" : "completed";
    setPending(true);
    setError(null);

    if (demoMode) {
      setGoals((current) =>
        current.map((item) =>
          item.id === goal.id
            ? {
                ...item,
                status: nextStatus,
                completedAt:
                  nextStatus === "completed" ? new Date().toISOString() : null,
              }
            : item,
        ),
      );
      setPending(false);
      return;
    }

    const res = await fetch("/api/journey/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId: goal.id, status: nextStatus }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not update goal");
      return;
    }
    setGoals((current) =>
      current.map((item) => (item.id === goal.id ? data.goal : item)),
    );
    void refresh();
  }

  async function removeGoal(goalId: string) {
    setPending(true);
    setError(null);

    if (demoMode) {
      setGoals((current) => current.filter((goal) => goal.id !== goalId));
      setPending(false);
      return;
    }

    const res = await fetch(`/api/journey/goals?goalId=${goalId}`, {
      method: "DELETE",
    });
    setPending(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not delete goal");
      return;
    }
    setGoals((current) => current.filter((goal) => goal.id !== goalId));
    void refresh();
  }

  async function onPhotoSelected(file: File | undefined) {
    if (!file) return;
    setPending(true);
    setError(null);
    setMessage(null);

    const uploaded = await uploadJourneyPhotoFromBrowser({ userId, file });
    if ("error" in uploaded && !uploaded.demoDataUrl) {
      setPending(false);
      setError(uploaded.error);
      return;
    }

    const storagePath = "path" in uploaded ? uploaded.path : `journey/${userId}/demo.jpg`;
    const previewUrl = uploaded.demoDataUrl ?? "";

    if (demoMode || uploaded.demoDataUrl) {
      const photo: ProgressPhoto = {
        id: crypto.randomUUID(),
        storagePath,
        imageUrl: previewUrl,
        caption: caption.trim() || null,
        takenAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      setPhotos((current) => [photo, ...current]);
      setCaption("");
      setMessage("Photo added");
      setPending(false);
      return;
    }

    const res = await fetch("/api/journey/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storagePath,
        caption: caption.trim() || null,
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not save photo");
      return;
    }
    setPhotos((current) => [data.photo, ...current]);
    setCaption("");
    setMessage("Photo added");
    void refresh();
  }

  async function removePhoto(photoId: string) {
    setPending(true);
    setError(null);

    if (demoMode) {
      setPhotos((current) => current.filter((photo) => photo.id !== photoId));
      setCaption("");
      setPending(false);
      setMessage("Photo deleted");
      return;
    }

    const res = await fetch(`/api/journey/photos?photoId=${photoId}`, {
      method: "DELETE",
    });
    setPending(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not delete photo");
      return;
    }
    setPhotos((current) => current.filter((photo) => photo.id !== photoId));
    setCaption("");
    setMessage("Photo deleted");
    void refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["goals", "Goals"],
            ["photos", "Progress Photos"],
            ["timeline", "Timeline"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "min-h-11 px-4 text-xs font-semibold tracking-wide uppercase transition",
              tab === id
                ? "bg-brand text-brand-foreground"
                : "border border-border bg-surface text-muted hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {message ? (
        <p className="text-sm text-brand" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {tab === "goals" ? (
        <div className="space-y-6">
          <form
            onSubmit={createGoal}
            className="space-y-4 border border-border bg-surface p-5"
          >
            <p className="font-display text-xl tracking-wide uppercase">
              Set a new goal
            </p>
            <label className="block text-sm">
              <span className="text-muted">Goal</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-2 w-full border border-border bg-background px-3 py-3 text-sm"
                maxLength={200}
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">Target date (optional)</span>
              <input
                type="date"
                value={targetDate}
                onChange={(event) => setTargetDate(event.target.value)}
                className="mt-2 w-full border border-border bg-background px-3 py-3 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={pending || !title.trim()}
              className="min-h-11 bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50"
            >
              Add goal
            </button>
          </form>

          {goals.length === 0 ? (
            <EmptyState
              title="Start with one goal"
              description="Pick something meaningful and measurable. Your journey begins with a single step."
            />
          ) : (
            <ul className="space-y-3">
              {goals.map((goal) => (
                <li
                  key={goal.id}
                  className="border border-border bg-surface p-4"
                >
                  {editingGoalId === goal.id ? (
                    <div className="space-y-3">
                      <input
                        value={editTitle}
                        onChange={(event) => setEditTitle(event.target.value)}
                        className="w-full border border-border bg-background px-3 py-2 text-sm"
                      />
                      <input
                        type="date"
                        value={editTargetDate}
                        onChange={(event) =>
                          setEditTargetDate(event.target.value)
                        }
                        className="w-full border border-border bg-background px-3 py-2 text-sm"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => saveGoalEdit(goal.id)}
                          className="min-h-10 bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingGoalId(null)}
                          className="min-h-10 border border-border px-4 text-xs font-semibold tracking-wide uppercase"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p
                            className={cn(
                              "text-base font-medium",
                              goal.status === "completed" &&
                                "text-muted line-through",
                            )}
                          >
                            {goal.title}
                          </p>
                          {goal.targetDate ? (
                            <p className="mt-1 text-xs text-muted">
                              Target: {formatDate(goal.targetDate)}
                            </p>
                          ) : null}
                          {goal.status === "completed" && goal.completedAt ? (
                            <p className="mt-1 text-xs text-brand">
                              Completed {formatDate(goal.completedAt)}
                            </p>
                          ) : null}
                        </div>
                        <span
                          className={cn(
                            "text-[10px] font-semibold tracking-[0.18em] uppercase",
                            goal.status === "completed"
                              ? "text-brand"
                              : "text-muted",
                          )}
                        >
                          {goal.status === "completed" ? "Done" : "Active"}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => toggleGoal(goal)}
                          className="min-h-10 border border-border px-3 text-xs font-semibold tracking-wide uppercase"
                        >
                          {goal.status === "completed"
                            ? "Mark active"
                            : "Mark complete"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGoalId(goal.id);
                            setEditTitle(goal.title);
                            setEditTargetDate(goal.targetDate ?? "");
                          }}
                          className="min-h-10 border border-border px-3 text-xs font-semibold tracking-wide uppercase"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => removeGoal(goal.id)}
                          className="min-h-10 px-3 text-xs font-semibold tracking-wide text-muted uppercase"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {tab === "photos" ? (
        <div className="space-y-6">
          <div className="space-y-4 border border-border bg-surface p-5">
            <p className="font-display text-xl tracking-wide uppercase">
              Add a progress photo
            </p>
            <label className="block text-sm">
              <span className="text-muted">Caption (optional)</span>
              <input
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                className="mt-2 w-full border border-border bg-background px-3 py-3 text-sm"
                maxLength={500}
              />
            </label>
            <label className="inline-flex min-h-11 cursor-pointer items-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase">
              Upload photo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/*"
                className="sr-only"
                onChange={(event) => onPhotoSelected(event.target.files?.[0])}
              />
            </label>
          </div>

          {photos.length === 0 ? (
            <EmptyState
              title="Capture your progress"
              description="Upload photos over time to see how far you've come. Before/after comparisons are coming soon."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map((photo) => (
                <figure
                  key={photo.id}
                  className="overflow-hidden border border-border bg-surface"
                >
                  <div className="flex items-center justify-center bg-black/5 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.imageUrl}
                      alt={photo.caption ?? "Progress photo"}
                      className="max-h-56 w-full max-w-[220px] object-contain"
                    />
                  </div>
                  <figcaption className="border-t border-border p-4">
                    <p className="text-xs tracking-wide text-muted uppercase">
                      {formatDate(photo.takenAt)}
                    </p>
                    {photo.caption ? (
                      <p className="mt-2 text-sm text-foreground">
                        {photo.caption}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      disabled={pending}
                      aria-label="Delete photo"
                      className="mt-4 inline-flex min-h-10 items-center gap-2 text-xs font-semibold tracking-wide text-muted uppercase transition hover:text-foreground disabled:opacity-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Delete photo
                    </button>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === "timeline" ? (
        timeline.length === 0 ? (
          <EmptyState
            title="Your story starts here"
            description="As you set goals and upload progress photos, your fitness journey will appear on this timeline."
          />
        ) : (
          <ol className="space-y-4 border-l border-border pl-5">
            {timeline.map((entry) => (
              <TimelineItem key={entry.id} entry={entry} />
            ))}
          </ol>
        )
      ) : null}
    </div>
  );
}

function TimelineItem({ entry }: { entry: JourneyTimelineEntry }) {
  const label =
    entry.type === "goal_created"
      ? "Goal created"
      : entry.type === "goal_completed"
        ? "Goal completed"
        : "Progress photo";

  return (
    <li className="relative">
      <span className="absolute top-1 -left-[1.35rem] size-2.5 bg-brand" />
      <p className="text-[10px] font-semibold tracking-[0.18em] text-brand uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">
        {entry.type === "photo_uploaded" ? entry.title : entry.title}
      </p>
      <p className="mt-1 text-xs text-muted">{formatDate(entry.occurredAt)}</p>
      {entry.type === "photo_uploaded" && entry.caption ? (
        <p className="mt-2 text-sm text-muted">{entry.caption}</p>
      ) : null}
      {entry.type === "photo_uploaded" && entry.imageUrl ? (
        <div className="mt-3 flex max-w-xs items-center justify-center border border-border bg-black/5 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={entry.imageUrl}
            alt=""
            className="max-h-48 w-full object-contain"
          />
        </div>
      ) : null}
    </li>
  );
}
