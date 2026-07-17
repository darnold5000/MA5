import Link from "next/link";

import type {
  CoachClientProgressRow,
  TrainingEngagementStatus,
} from "@/features/programs/types";
import { cn } from "@/lib/utils";

const STATUS_DOT: Record<TrainingEngagementStatus, string> = {
  active: "bg-emerald-500",
  watch: "bg-amber-400",
  stale: "bg-brand",
};

export function CoachTrainingProgress({
  rows,
}: {
  rows: CoachClientProgressRow[];
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
            Training
          </p>
          <h2 className="mt-1 font-display text-2xl tracking-wide uppercase">
            Client progress
          </h2>
          <p className="mt-1 text-sm text-muted">
            Who&apos;s on track — and who may need a check-in.
          </p>
        </div>
        <Link
          href="/admin/programs/assign"
          className="text-xs font-semibold tracking-wide text-brand uppercase hover:underline"
        >
          Manage assignments →
        </Link>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-3 lg:hidden">
        {rows.map((row) => (
          <article
            key={row.clientId}
            className="border border-border bg-surface p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-xl tracking-wide uppercase">
                {row.clientName}
              </h3>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                <span
                  className={cn("size-2 rounded-full", STATUS_DOT[row.status])}
                  aria-hidden
                />
                {row.statusLabel}
              </span>
            </div>
            <p className="mt-3 text-xs font-semibold tracking-wide text-muted uppercase">
              Current program
            </p>
            <p className="mt-1 text-sm text-foreground">
              {row.programTitle ?? "—"}
            </p>
            <p className="mt-3 text-sm text-foreground">
              Progress{" "}
              <span className="font-semibold">
                {row.completedCount} / {row.totalCount}
              </span>{" "}
              <span className="text-muted">({row.progressPercent}%)</span>
            </p>
            <div className="mt-2 h-1.5 w-full bg-background">
              <div
                className="h-1.5 bg-brand"
                style={{ width: `${Math.min(row.progressPercent, 100)}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-muted">
              Last workout · {row.lastWorkoutLabel}
            </p>
          </article>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto border border-border bg-surface lg:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs tracking-wide text-muted uppercase">
              <th className="px-5 py-3 font-semibold">Client</th>
              <th className="px-5 py-3 font-semibold">Program</th>
              <th className="px-5 py-3 font-semibold">Progress</th>
              <th className="px-5 py-3 font-semibold">Last workout</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.clientId}>
                <td className="px-5 py-4 font-display text-base tracking-wide uppercase">
                  {row.clientName}
                </td>
                <td className="px-5 py-4 text-foreground">
                  {row.programTitle ?? "—"}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-20 bg-background">
                      <div
                        className="h-1.5 bg-brand"
                        style={{
                          width: `${Math.min(row.progressPercent, 100)}%`,
                        }}
                      />
                    </div>
                    <span className="tabular-nums text-muted">
                      {row.progressPercent}%
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4 text-muted">{row.lastWorkoutLabel}</td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        STATUS_DOT[row.status],
                      )}
                      aria-hidden
                    />
                    {row.statusLabel}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 ? (
        <p className="border border-border bg-surface px-5 py-6 text-sm text-muted">
          No clients with training data yet. Assign a program to get started.
        </p>
      ) : null}
    </section>
  );
}
