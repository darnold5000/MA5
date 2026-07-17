"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { ClientProgramDay } from "@/features/programs/types";
import { VideoPlayer } from "@/lib/video/player";

type Props = {
  days: ClientProgramDay[];
  /** Kept for call-site clarity; completion uses the signed-in session. */
  clientUserId?: string;
};

export function ClientProgramsView({ days }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = days.filter((d) => d.entry.entryDate >= today);
  const history = days.filter((d) => d.entry.entryDate < today || d.completed);
  const todayEntry =
    upcoming.find((d) => d.entry.entryDate === today) ?? upcoming[0] ?? null;

  return (
    <div className="space-y-8">
      <section className="border border-border bg-surface p-6">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">
          Today’s workout
        </p>
        {todayEntry ? (
          <div className="mt-3">
            <h2 className="font-display text-3xl tracking-wide uppercase">
              {todayEntry.entry.title}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {todayEntry.entry.entryDate} · {todayEntry.sourceLabel}
              {todayEntry.completed ? " · Completed" : ""}
            </p>
            <Link
              href={`/app/programs/workouts/${todayEntry.entry.id}`}
              className="mt-5 inline-flex min-h-11 items-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase"
            >
              {todayEntry.completed ? "Review workout" : "Start workout"}
            </Link>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">
            No published workouts yet. Your coach will assign training here.
          </p>
        )}
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
        <h2 className="font-display text-2xl tracking-wide uppercase">
          History
        </h2>
        <ul className="mt-3 space-y-2">
          {history
            .filter((d) => d.completed)
            .map((d) => (
              <li
                key={d.entry.id}
                className="border border-border bg-surface px-4 py-3 text-sm"
              >
                {d.entry.entryDate} · {d.entry.title}
              </li>
            ))}
          {history.filter((d) => d.completed).length === 0 ? (
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
