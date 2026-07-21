"use client";

import { useState } from "react";

import { PeriodGrid } from "@/components/analytics/metric-card";
import { SimpleBarChart } from "@/components/analytics/simple-bar-chart";
import {
  ViewToggle,
  type AnalyticsViewMode,
} from "@/components/analytics/view-toggle";
import type { ChartPoint, PeriodMetric } from "@/features/analytics/types";

export function MetricsViewPanel({
  metrics,
  chartPoints,
  columns = 4,
  formatChartValue,
  numbersLabel = "By period",
  chartLabel = "Over time",
  defaultView = "numbers",
}: {
  metrics: PeriodMetric[];
  chartPoints: ChartPoint[];
  columns?: 4 | 5;
  formatChartValue?: (value: number) => string;
  numbersLabel?: string;
  chartLabel?: string;
  defaultView?: AnalyticsViewMode;
}) {
  const [view, setView] = useState<AnalyticsViewMode>(defaultView);
  const hasChartData = chartPoints.some((p) => p.value > 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">
          {view === "numbers" ? numbersLabel : chartLabel}
        </p>
        <ViewToggle value={view} onChange={setView} />
      </div>
      {view === "numbers" ? (
        <PeriodGrid metrics={metrics} columns={columns} />
      ) : hasChartData ? (
        <SimpleBarChart points={chartPoints} formatValue={formatChartValue} />
      ) : (
        <p className="border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          Not enough data for a chart yet.
        </p>
      )}
    </div>
  );
}
