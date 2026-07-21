"use client";

import { useMemo, useState } from "react";

import {
  formatVolume,
  type ExerciseHistorySummary,
} from "@/features/programs/exercise-history";
import { cn } from "@/lib/utils";

export function ExerciseHistoryPanel({
  summaries,
}: {
  summaries: ExerciseHistorySummary[];
}) {
  const [selectedId, setSelectedId] = useState(
    summaries[0]?.exerciseId ?? null,
  );

  const selected = useMemo(
    () => summaries.find((s) => s.exerciseId === selectedId) ?? summaries[0],
    [summaries, selectedId],
  );

  if (summaries.length === 0 || !selected) {
    return (
      <section className="border border-border bg-surface p-6">
        <h2 className="font-display text-2xl tracking-wide uppercase">
          Lift progress
        </h2>
        <p className="mt-2 text-sm text-muted">
          Log weights in your workouts and progress charts will show up here.
        </p>
      </section>
    );
  }

  const maxBar = Math.max(...selected.sessions.map((s) => s.maxWeightLb), 1);
  const progressUp = selected.progressPercent >= 0;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-2xl tracking-wide uppercase">
          Lift progress
        </h2>
        <p className="mt-1 text-sm text-muted">
          Weight used over time from your logged sets.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {summaries.map((s) => (
          <button
            key={s.exerciseId}
            type="button"
            onClick={() => setSelectedId(s.exerciseId)}
            className={cn(
              "inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-semibold tracking-wide uppercase",
              s.exerciseId === selected.exerciseId
                ? "border-brand bg-brand text-brand-foreground"
                : "border-border bg-surface text-muted hover:text-foreground",
            )}
          >
            {s.exerciseTitle}
          </button>
        ))}
      </div>

      <div className="border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-3xl tracking-wide uppercase">
              {selected.exerciseTitle}
            </p>
            <div className="mt-4 flex flex-wrap gap-8">
              <div>
                <p className="text-3xl font-semibold tabular-nums">
                  {selected.estimated1Rm} lbs
                </p>
                <p className="mt-1 text-xs text-muted">Estimated 1RM</p>
              </div>
              <div>
                <p
                  className={cn(
                    "text-3xl font-semibold tabular-nums",
                    progressUp ? "hub-text-success" : "text-brand",
                  )}
                >
                  {progressUp ? "↑" : "↓"} {Math.abs(selected.progressPercent)}%
                </p>
                <p className="mt-1 text-xs text-muted">since you started</p>
              </div>
            </div>
          </div>
        </div>

        <div
          className="mt-8 flex items-end gap-2 sm:gap-3"
          role="img"
          aria-label={`${selected.exerciseTitle} max weight over time`}
        >
          {selected.sessions.map((point) => {
            const height =
              point.maxWeightLb === 0
                ? 0
                : Math.max(8, Math.round((point.maxWeightLb / maxBar) * 140));
            return (
              <div
                key={point.date}
                className="flex min-w-0 flex-1 flex-col items-center gap-2"
              >
                <span className="text-[10px] tabular-nums text-muted">
                  {point.maxWeightLb}
                </span>
                <div
                  className="flex h-36 w-full items-end justify-center"
                  aria-hidden
                >
                  <div
                    className="w-full max-w-14 bg-brand/85 transition-all"
                    style={{ height: `${height}px` }}
                    title={`${point.dateLabel}: ${point.maxWeightLb} lb`}
                  />
                </div>
                <span className="text-[10px] font-semibold tracking-wide text-muted uppercase">
                  {point.dateLabel}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total volume", value: formatVolume(selected.totalVolumeLb) },
            { label: "Total reps", value: String(selected.totalReps) },
            { label: "Avg weight", value: `${selected.avgWeightLb} lbs` },
            { label: "Max weight", value: `${selected.maxWeightLb} lbs` },
          ].map((stat) => (
            <div
              key={stat.label}
              className="border border-border bg-background px-3 py-3"
            >
              <p className="text-lg font-semibold tabular-nums">{stat.value}</p>
              <p className="mt-0.5 text-[11px] text-muted">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">
            History
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] tracking-wide text-muted uppercase">
                  <th className="py-2 pr-3 font-semibold">Date</th>
                  <th className="py-2 pr-3 font-semibold">Max wt</th>
                  <th className="py-2 pr-3 font-semibold">Reps</th>
                  <th className="py-2 pr-3 font-semibold">Volume</th>
                  <th className="py-2 font-semibold">Est. 1RM</th>
                </tr>
              </thead>
              <tbody>
                {[...selected.sessions].reverse().map((row) => (
                  <tr key={row.date} className="border-b border-border/70">
                    <td className="py-2.5 pr-3">{row.dateLabel}</td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {row.maxWeightLb} lb
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">{row.totalReps}</td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {formatVolume(row.totalVolumeLb)}
                    </td>
                    <td className="py-2.5 tabular-nums">{row.estimated1Rm} lb</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
