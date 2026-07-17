"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type {
  ClientProgramDay,
  ClientTrainingProgress,
} from "@/features/programs/types";
import { VideoPlayer } from "@/lib/video/player";

type Props = {
  days: ClientProgramDay[];
  progress: ClientTrainingProgress;
  /** Kept for call-site clarity; completion uses the signed-in session. */
  clientUserId?: string;
};

export function ClientProgramsView({ days, progress }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = days.filter((d) => d.entry.entryDate >= today);
  const historyCompleted = days
    .filter((d) => d.completed)
    .sort((a, b) => b.entry.entryDate.localeCompare(a.entry.entryDate));

  return (
    <div className="space-y-8">
      <section className="border border-border bg-surface p-6">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">
          Current program
        </p>
        <h2 className="mt-2 font-display text-3xl tracking-wide uppercase">
          {progress.programTitle ?? "No program assigned"}
        </h2>
        {progress.weekLabel ? (
          <p className="mt-2 text-sm text-muted">{progress.weekLabel}</p>
        ) : null}

        <div className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">
              Progress
            </p>
            <p className="text-sm text-foreground">
              {progress.completedCount} / {progress.totalCount} workouts complete
              <span className="text-muted"> · {progress.progressPercent}%</span>
            </p>
          </div>
          <div className="mt-3 h-2.5 w-full bg-background">
            <div
              className="h-2.5 bg-brand transition-[width]"
              style={{ width: `${Math.min(progress.progressPercent, 100)}%` }}
            />
          </div>
          {progress.streakDays > 0 ? (
            <p className="mt-2 text-xs text-muted">
              {progress.streakDays}-day training streak
            </p>
          ) : null}
        </div>
      </section>

      <section className="border border-border bg-surface p-6">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">
          Today&apos;s workout
        </p>
        {progress.todayWorkout ? (
          <div className="mt-3">
            <h2 className="font-display text-3xl tracking-wide uppercase">
              {progress.todayWorkout.title}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {progress.todayWorkout.completed
                ? "Completed ✔"
                : "Ready when you are"}
            </p>
            <Link
              href={`/app/programs/workouts/${progress.todayWorkout.entryId}`}
              className="mt-5 inline-flex min-h-11 items-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase"
            >
              {progress.todayWorkout.completed
                ? "Review workout"
                : "Start workout"}
            </Link>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">
            No published workouts yet. Your coach will assign training here.
          </p>
        )}

        {progress.lastWorkout ? (
          <div className="mt-6 border-t border-border pt-5">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">
              Last workout
            </p>
            <p className="mt-2 text-sm text-foreground">
              {progress.lastWorkout.title}
            </p>
            <p className="mt-0.5 text-sm text-muted">
              {progress.lastWorkout.dateLabel} ✔
            </p>
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="font-display text-2xl tracking-wide uppercase">
          Upcoming
        </h2>
        <ul className="mt-3 space-y-2">
          {upcoming.map((d) => (
            <li key={d.entry.id}>
              <Link
                href={`/app/programs/workouts/${d.entry.id}`}
                className="flex items-center justify-between border border-border bg-surface px-4 py-3 hover:border-brand/50"
              >
                <span>
                  <span className="font-semibold">{d.entry.entryDate}</span> ·{" "}
                  {d.entry.title}
                  <span className="ml-2 text-xs text-muted">
                    {d.sourceLabel}
                  </span>
                </span>
                <span className="text-xs font-semibold tracking-wide text-brand uppercase">
                  {d.completed ? "Done" : "Open"}
                </span>
              </Link>
            </li>
          ))}
          {upcoming.length === 0 ? (
            <li className="text-sm text-muted">Nothing scheduled ahead.</li>
          ) : null}
        </ul>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl tracking-wide uppercase">
            Workout history
          </h2>
          <p className="text-xs text-muted">
            {historyCompleted.length} completed
          </p>
        </div>
        <ul className="mt-3 space-y-2">
          {historyCompleted.map((d) => (
            <li key={d.entry.id}>
              <Link
                href={`/app/programs/workouts/${d.entry.id}`}
                className="flex items-center justify-between border border-border bg-surface px-4 py-3 text-sm hover:border-brand/50"
              >
                <span>
                  {d.entry.entryDate} · {d.entry.title}
                </span>
                <span className="text-xs font-semibold tracking-wide text-emerald-400 uppercase">
                  Completed ✔
                </span>
              </Link>
            </li>
          ))}
          {historyCompleted.length === 0 ? (
            <li className="text-sm text-muted">No completed workouts yet.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

type PlayerProps = {
  day: ClientProgramDay;
  clientUserId?: string;
};

export function ClientWorkoutPlayer({ day }: PlayerProps) {
  const router = useRouter();
  const [note, setNote] = useState(day.completion?.clientNote ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markComplete() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/programs/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        calendarEntryId: day.entry.id,
        clientNote: note,
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not complete");
      return;
    }
    router.refresh();
  }

  const workout = day.workout;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/app/programs"
          className="text-xs font-semibold tracking-wide text-muted uppercase hover:text-foreground"
        >
          ← Back to programs
        </Link>
        <h1 className="mt-3 font-display text-3xl tracking-wide uppercase">
          {day.entry.title}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {day.entry.entryDate} · {day.sourceLabel}
          {day.completed ? " · Completed" : ""}
        </p>
      </div>

      {workout?.coachInstructions ? (
        <section className="border border-border bg-surface p-5">
          <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
            Coach instructions
          </h2>
          <p className="mt-2 text-sm">{workout.coachInstructions}</p>
        </section>
      ) : null}

      <div className="space-y-4">
        {workout?.blocks.map((block) => (
          <article
            key={block.id}
            className="border border-border bg-surface p-5"
          >
            <p className="text-xs font-semibold tracking-wide text-brand uppercase">
              {block.label}
              {block.sectionTitle ? ` · ${block.sectionTitle}` : ""}
            </p>
            <h3 className="mt-1 font-display text-2xl tracking-wide uppercase">
              {block.exercise?.title ?? "Exercise"}
            </h3>
            <p className="mt-1 text-sm text-muted">
              {block.sets
                .map((s) => {
                  const reps = s.reps != null ? `${s.reps}` : "–";
                  return s.weightLb != null
                    ? `${reps} @ ${s.weightLb}lb`
                    : `${reps} reps`;
                })
                .join(" · ")}
            </p>
            {block.exercise ? (
              <div className="mt-4 max-w-lg">
                <VideoPlayer
                  videoSource={block.exercise.videoSource}
                  videoUrl={block.exercise.videoUrl}
                  playbackUrl={block.exercise.demoPlaybackUrl}
                  title={block.exercise.title}
                />
              </div>
            ) : null}
            {block.exercise?.pointsOfPerformance ? (
              <p className="mt-3 text-sm text-muted">
                {block.exercise.pointsOfPerformance}
              </p>
            ) : null}
            {block.sessionCues ? (
              <p className="mt-2 text-sm">{block.sessionCues}</p>
            ) : null}
          </article>
        ))}
      </div>

      <section className="border border-border bg-surface p-5">
        <label className="block space-y-1 text-sm">
          <span className="text-xs font-semibold tracking-wide uppercase">
            Session note (optional)
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full border border-border bg-background px-3 py-2"
            placeholder="How did it feel?"
          />
        </label>
        <button
          type="button"
          disabled={pending}
          onClick={markComplete}
          className="mt-4 inline-flex min-h-11 items-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50"
        >
          {day.completed ? "Update completion" : "Mark complete"}
        </button>
        {error ? (
          <p className="mt-2 text-sm text-brand" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}
