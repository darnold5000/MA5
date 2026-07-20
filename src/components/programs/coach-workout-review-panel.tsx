"use client";

import { useEffect, useState } from "react";

import { getSetLogForBlock } from "@/features/programs/set-logs";
import type { CoachWorkoutReview } from "@/features/programs/types";
import { cn } from "@/lib/utils";

type Props = {
  clientUserId: string;
  clientName: string;
  calendarEntryId: string;
  onClose: () => void;
};

function formatWeight(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value} lb`;
}

function weightDelta(
  prescribed: number | null,
  actual: number | null,
): number | null {
  if (prescribed == null || actual == null) return null;
  return actual - prescribed;
}

export function CoachWorkoutReviewPanel({
  clientUserId,
  clientName,
  calendarEntryId,
  onClose,
}: Props) {
  const [review, setReview] = useState<CoachWorkoutReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        clientUserId,
        calendarEntryId,
        clientName,
      });
      const res = await fetch(
        `/api/admin/programs/workout-review?${params.toString()}`,
      );
      const data = await res.json();
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setError(data.error ?? "Could not load workout");
        return;
      }
      setReview(data.review as CoachWorkoutReview);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [calendarEntryId, clientName, clientUserId]);

  const loggedSetCount = review?.setLogs.filter((log) => log.weightLb != null).length ?? 0;

  return (
    <section className="th-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide uppercase th-muted">
            Workout review
          </p>
          <h2 className="mt-1 text-lg font-bold">
            {review?.entry.title ?? "Loading…"}
          </h2>
          <p className="mt-1 text-sm th-muted">
            {clientName}
            {review ? ` · ${review.entry.entryDate}` : ""}
            {review?.completion ? " · Completed" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold tracking-wide uppercase th-muted hover:text-[var(--th-text)]"
        >
          Close
        </button>
      </div>

      {loading ? (
        <p className="mt-6 text-sm th-muted">Loading performance…</p>
      ) : null}

      {error ? (
        <p className="mt-6 text-sm text-[var(--th-blue)]" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && review ? (
        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <p className="text-xs font-semibold tracking-wide uppercase th-muted">
                Status
              </p>
              <p className="mt-1 font-medium">
                {review.completion ? "Completed" : "Not completed"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide uppercase th-muted">
                Sets logged
              </p>
              <p className="mt-1 font-medium">{loggedSetCount}</p>
            </div>
            {review.completion ? (
              <div>
                <p className="text-xs font-semibold tracking-wide uppercase th-muted">
                  Completed at
                </p>
                <p className="mt-1 font-medium">
                  {new Date(review.completion.completedAt).toLocaleString()}
                </p>
              </div>
            ) : null}
          </div>

          {review.completion?.clientNote ? (
            <div className="border border-[var(--th-border)] bg-white px-4 py-3 text-sm">
              <p className="text-xs font-semibold tracking-wide uppercase th-muted">
                Athlete note
              </p>
              <p className="mt-2 whitespace-pre-wrap">
                {review.completion.clientNote}
              </p>
            </div>
          ) : null}

          {review.workout?.coachInstructions ? (
            <div className="border border-[var(--th-border)] bg-white px-4 py-3 text-sm">
              <p className="text-xs font-semibold tracking-wide uppercase th-muted">
                Coach instructions
              </p>
              <p className="mt-2">{review.workout.coachInstructions}</p>
            </div>
          ) : null}

          {review.workout?.blocks.length ? (
            <div className="space-y-4">
              {review.workout.blocks.map((block) => (
                <article
                  key={block.id}
                  className="border border-[var(--th-border)] bg-white p-4"
                >
                  <p className="text-xs font-semibold tracking-wide uppercase text-[var(--th-blue)]">
                    {block.label}
                    {block.sectionTitle ? ` · ${block.sectionTitle}` : ""}
                  </p>
                  <h3 className="mt-1 font-bold">
                    {block.exercise?.title ?? "Exercise"}
                  </h3>

                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[420px] text-sm">
                      <thead>
                        <tr className="border-b border-[var(--th-border)] text-left text-xs tracking-wide th-muted uppercase">
                          <th className="py-2 pr-3 font-semibold">Set</th>
                          <th className="py-2 pr-3 font-semibold">Reps</th>
                          <th className="py-2 pr-3 font-semibold">Prescribed</th>
                          <th className="py-2 pr-3 font-semibold">Athlete</th>
                          <th className="py-2 font-semibold">Δ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {block.sets.map((set) => {
                          const log = getSetLogForBlock(
                            review.setLogs,
                            block.id,
                            set.setNumber,
                          );
                          const athleteWeight = log?.weightLb ?? null;
                          const delta = weightDelta(set.weightLb, athleteWeight);
                          return (
                            <tr
                              key={set.setNumber}
                              className="border-b border-[var(--th-border)]/60"
                            >
                              <td className="py-2 pr-3 font-medium">
                                {set.setNumber}
                              </td>
                              <td className="py-2 pr-3">{set.reps ?? "—"}</td>
                              <td className="py-2 pr-3 text-muted">
                                {formatWeight(set.weightLb)}
                              </td>
                              <td
                                className={cn(
                                  "py-2 pr-3 font-medium",
                                  athleteWeight != null
                                    ? "text-[var(--th-text)]"
                                    : "text-muted",
                                )}
                              >
                                {formatWeight(athleteWeight)}
                              </td>
                              <td className="py-2">
                                {delta == null ? (
                                  <span className="text-muted">—</span>
                                ) : delta === 0 ? (
                                  <span className="text-muted">0</span>
                                ) : (
                                  <span
                                    className={cn(
                                      "font-medium",
                                      delta > 0
                                        ? "text-emerald-600"
                                        : "text-amber-700",
                                    )}
                                  >
                                    {delta > 0 ? `+${delta}` : delta}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {block.sessionCues ? (
                    <p className="mt-3 text-sm th-muted">{block.sessionCues}</p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm th-muted">
              No workout content is attached to this calendar entry.
            </p>
          )}

          {loggedSetCount === 0 ? (
            <p className="text-sm th-muted">
              No weights logged yet. The athlete will record sets in their
              workout player.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
