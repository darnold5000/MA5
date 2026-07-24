"use client";

import { useMemo, useState } from "react";
import { useServerRefresh } from "@/hooks/use-server-refresh";

import { buildTimeline } from "@/features/journey/timeline";
import type {
  JourneyTimelineEntry,
  MemberGoal,
  MemberJourneyData,
  ProgressPhoto,
} from "@/features/journey/types";
import { uploadJourneyPhotoFromBrowser } from "@/lib/assets/browser-upload";
import { CompactDatePicker } from "@/components/ui/compact-date-picker";
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
    <div className="rounded-xl border border-dashed border-border/80 bg-surface/50 px-6 py-12 text-center">
      <p className="font-display text-lg tracking-wide uppercase sm:text-xl">
        {title}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
        {description}
      </p>
    </div>
  );
}

const inputClassName =
  "mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition placeholder:text-muted/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

const labelClassName = "text-xs font-semibold tracking-wide text-muted uppercase";

const cardClassName =
  "rounded-xl border border-border/80 bg-surface p-6 shadow-sm sm:p-7";

const btnPrimaryClassName =
  "inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-5 text-sm font-semibold tracking-wide text-brand-foreground uppercase transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50";

const btnSecondaryClassName =
  "inline-flex min-h-9 items-center justify-center rounded-lg border border-border bg-background px-3.5 text-xs font-semibold tracking-wide text-foreground uppercase transition hover:border-brand/40 hover:bg-surface";

const btnGhostClassName =
  "inline-flex min-h-9 items-center justify-center rounded-lg px-3.5 text-xs font-semibold tracking-wide text-muted uppercase transition hover:text-foreground";

const JOURNEY_TABS = [
  ["goals", "Goals"],
  ["photos", "Photos"],
  ["timeline", "Timeline"],
] as const;

export function MyJourneyView({
  userId,
  initialData,
  demoMode = false,
}: MyJourneyViewProps) {
  const { refresh, isRefreshing } = useServerRefresh();
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
    <div className="space-y-5">
      <div
        className="inline-flex w-full max-w-lg rounded-xl border border-border bg-background/60 p-1 sm:max-w-xl"
        role="tablist"
        aria-label="Journey sections"
      >
        {JOURNEY_TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "min-h-10 flex-1 rounded-lg px-3 text-[11px] font-semibold tracking-wide uppercase transition sm:px-4 sm:text-xs",
              tab === id
                ? "bg-brand text-brand-foreground shadow-sm"
                : "text-muted hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {message ? (
        <p className="text-sm font-medium text-brand" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {tab === "goals" ? (
        <div>
          <form onSubmit={createGoal} className={cardClassName}>
            <h2 className="font-display text-lg tracking-wide uppercase sm:text-xl">
              Set a new goal
            </h2>
            <p className="mt-1 text-sm text-muted">
              Name something meaningful and measurable for your training.
            </p>
            <div className="mt-6 space-y-5">
              <label className="block">
                <span className={labelClassName}>Goal</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className={inputClassName}
                  placeholder="e.g. Run a 5K under 30 minutes"
                  maxLength={200}
                />
              </label>
              <div>
                <span className={labelClassName}>Target date (optional)</span>
                <div className="mt-1.5">
                  <CompactDatePicker
                    value={targetDate}
                    onChange={setTargetDate}
                    optional
                  />
                </div>
              </div>
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={pending || !title.trim()}
                  className={btnPrimaryClassName}
                >
                  Add goal
                </button>
              </div>
            </div>
          </form>

          <div className="mt-12 space-y-5">
            {goals.length > 0 ? (
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-lg tracking-wide uppercase">
                  Your goals
                </h2>
                <span className="text-xs text-muted">
                  {goals.length} {goals.length === 1 ? "goal" : "goals"}
                </span>
              </div>
            ) : null}

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
                    className="rounded-xl border border-border/80 bg-surface p-5 shadow-sm transition hover:border-border"
                  >
                    {editingGoalId === goal.id ? (
                      <div className="space-y-4">
                        <input
                          value={editTitle}
                          onChange={(event) => setEditTitle(event.target.value)}
                          className={cn(inputClassName, "mt-0")}
                        />
                        <CompactDatePicker
                          value={editTargetDate}
                          onChange={setEditTargetDate}
                          optional
                        />
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => saveGoalEdit(goal.id)}
                            className={btnPrimaryClassName}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingGoalId(null)}
                            className={btnSecondaryClassName}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                "text-base font-semibold leading-snug",
                                goal.status === "completed" &&
                                  "text-muted line-through decoration-muted/60",
                              )}
                            >
                              {goal.title}
                            </p>
                            {goal.targetDate ? (
                              <p className="mt-1.5 text-sm text-muted">
                                Target · {formatDate(goal.targetDate)}
                              </p>
                            ) : null}
                            {goal.status === "completed" && goal.completedAt ? (
                              <p className="mt-1 text-sm font-medium text-brand">
                                Completed · {formatDate(goal.completedAt)}
                              </p>
                            ) : null}
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] uppercase",
                              goal.status === "completed"
                                ? "bg-brand/15 text-brand"
                                : "bg-background text-muted ring-1 ring-border",
                            )}
                          >
                            {goal.status === "completed" ? "Done" : "Active"}
                          </span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-4">
                          <button
                            type="button"
                            onClick={() => toggleGoal(goal)}
                            className={btnSecondaryClassName}
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
                            className={btnSecondaryClassName}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => removeGoal(goal.id)}
                            className={btnGhostClassName}
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
        </div>
      ) : null}

      {tab === "photos" ? (
        <div>
          <div className={cardClassName}>
            <h2 className="font-display text-lg tracking-wide uppercase sm:text-xl">
              Add a progress photo
            </h2>
            <p className="mt-1 text-sm text-muted">
              Track visual progress over time — captions are optional.
            </p>
            <div className="mt-6 space-y-5">
              <label className="block">
                <span className={labelClassName}>Caption (optional)</span>
                <input
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  className={inputClassName}
                  maxLength={500}
                />
              </label>
              <label className={cn(btnPrimaryClassName, "cursor-pointer")}>
                Upload photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/*"
                  className="sr-only"
                  onChange={(event) => onPhotoSelected(event.target.files?.[0])}
                />
              </label>
            </div>
          </div>

          <div className="mt-12">
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
                    className="overflow-hidden rounded-xl border border-border/80 bg-surface shadow-sm"
                  >
                    <div className="flex items-center justify-center bg-black/[0.03] p-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.imageUrl}
                        alt={photo.caption ?? "Progress photo"}
                        className="max-h-56 w-full max-w-[220px] object-contain"
                      />
                    </div>
                    <figcaption className="border-t border-border/60 p-4">
                      <p className="text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">
                        {formatDate(photo.takenAt)}
                      </p>
                      {photo.caption ? (
                        <p className="mt-2 text-sm leading-relaxed text-foreground">
                          {photo.caption}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        disabled={pending}
                        aria-label="Delete photo"
                        className={cn(
                          btnGhostClassName,
                          "mt-4 gap-2 disabled:opacity-50",
                        )}
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
        </div>
      ) : null}

      {tab === "timeline" ? (
        timeline.length === 0 ? (
          <EmptyState
            title="Your story starts here"
            description="As you set goals and upload progress photos, your fitness journey will appear on this timeline."
          />
        ) : (
          <ol className="space-y-6 border-l-2 border-brand/30 pl-6">
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
      <span className="absolute top-1.5 -left-[1.62rem] size-3 rounded-full bg-brand ring-4 ring-background" />
      <p className="text-[10px] font-semibold tracking-[0.16em] text-brand uppercase">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold leading-snug text-foreground">
        {entry.type === "photo_uploaded" ? entry.title : entry.title}
      </p>
      <p className="mt-1 text-sm text-muted">{formatDate(entry.occurredAt)}</p>
      {entry.type === "photo_uploaded" && entry.caption ? (
        <p className="mt-2 text-sm leading-relaxed text-muted">{entry.caption}</p>
      ) : null}
      {entry.type === "photo_uploaded" && entry.imageUrl ? (
        <div className="mt-3 flex max-w-xs items-center justify-center overflow-hidden rounded-lg border border-border/80 bg-black/[0.03] p-2">
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
