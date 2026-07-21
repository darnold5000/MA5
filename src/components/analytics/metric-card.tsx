"use client";

import Link from "next/link";

import { CountUpValue } from "@/components/analytics/count-up-value";
import {
  COUNTUP_SESSION_KEYS,
  metricToneClass,
} from "@/components/analytics/metric-tone";
import type {
  MetricTone,
  OverviewMetric,
  PeriodMetric,
} from "@/features/analytics/types";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  note,
  href,
  className,
  animate = false,
  delayMs = 0,
  tone = "default",
  countUpSessionKey = COUNTUP_SESSION_KEYS.dailyOps,
  trend,
}: {
  label: string;
  value: string;
  note?: string;
  href?: string;
  className?: string;
  animate?: boolean;
  delayMs?: number;
  tone?: MetricTone;
  countUpSessionKey?: string;
  trend?: {
    percent: number;
    label: string;
    direction: "up" | "down" | "flat";
  } | null;
}) {
  const trendText =
    trend == null
      ? null
      : trend.direction === "up"
        ? `↑ ${trend.percent}% ${trend.label}`
        : trend.direction === "down"
          ? `↓ ${trend.percent}% ${trend.label}`
          : `→ Flat ${trend.label}`;

  const trendClass =
    trend?.direction === "up"
      ? "text-emerald-700"
      : trend?.direction === "down"
        ? "text-brand"
        : "text-muted";

  const body = (
    <>
      <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-4 font-display text-4xl tracking-wide",
          metricToneClass(tone),
        )}
      >
        {animate ? (
          <CountUpValue
            value={value}
            delayMs={delayMs}
            sessionKey={countUpSessionKey}
          />
        ) : (
          value
        )}
      </p>
      {trendText ? (
        <p className={cn("mt-2 text-xs font-medium", trendClass)}>{trendText}</p>
      ) : null}
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

export function OverviewGrid({
  metrics,
  animate = false,
}: {
  metrics: OverviewMetric[];
  animate?: boolean;
}) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map((m, i) => (
        <MetricCard
          key={m.id}
          label={m.label}
          value={m.value}
          href={m.href}
          animate={animate}
          delayMs={animate ? 120 + i * 80 : 0}
        />
      ))}
    </section>
  );
}

export function PeriodGrid({
  metrics,
  columns = 4,
  animate = false,
  countUpSessionKey = COUNTUP_SESSION_KEYS.dailyOps,
}: {
  metrics: PeriodMetric[];
  columns?: 4 | 5;
  animate?: boolean;
  countUpSessionKey?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-3 sm:grid-cols-2",
        columns === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4",
      )}
    >
      {metrics.map((m, i) => (
        <MetricCard
          key={m.id}
          label={m.label}
          value={m.value}
          note={m.note}
          tone={m.tone}
          animate={animate}
          delayMs={animate ? i * 70 : 0}
          countUpSessionKey={countUpSessionKey}
        />
      ))}
    </div>
  );
}
