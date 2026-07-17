import Link from "next/link";

import type { OverviewMetric, PeriodMetric } from "@/features/analytics/types";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  note,
  href,
  className,
}: {
  label: string;
  value: string;
  note?: string;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">
        {label}
      </p>
      <p className="mt-4 font-display text-4xl tracking-wide text-foreground">
        {value}
      </p>
      {note ? <p className="mt-2 text-xs text-muted">{note}</p> : null}
      {href ? <div className="mt-4 h-px w-full bg-border" /> : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "border border-border bg-surface p-5 transition hover:border-brand",
          className,
        )}
      >
        {body}
      </Link>
    );
  }

  return (
    <div className={cn("border border-border bg-surface p-5", className)}>
      {body}
    </div>
  );
}

export function OverviewGrid({ metrics }: { metrics: OverviewMetric[] }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map((m) => (
        <MetricCard
          key={m.id}
          label={m.label}
          value={m.value}
          href={m.href}
        />
      ))}
    </section>
  );
}

export function PeriodGrid({
  metrics,
  columns = 4,
}: {
  metrics: PeriodMetric[];
  columns?: 4 | 5;
}) {
  return (
    <div
      className={cn(
        "grid gap-3 sm:grid-cols-2",
        columns === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4",
      )}
    >
      {metrics.map((m) => (
        <MetricCard
          key={m.id}
          label={m.label}
          value={m.value}
          note={m.note}
        />
      ))}
    </div>
  );
}
