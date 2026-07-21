"use client";

import { useState } from "react";

import { MetricCard } from "@/components/analytics/metric-card";
import { COUNTUP_SESSION_KEYS } from "@/components/analytics/metric-tone";
import { SimpleBarChart } from "@/components/analytics/simple-bar-chart";
import {
  ViewToggle,
  type AnalyticsViewMode,
} from "@/components/analytics/view-toggle";
import { EMPTY_FEES } from "@/features/analytics/demo-data";
import type { FeeSnapshot } from "@/features/analytics/types";
import { formatCompactMoney } from "@/features/analytics/format";

function formatChartMoney(value: number): string {
  if (value >= 1000) return `$${Math.round(value / 1000)}k`;
  return `$${value}`;
}

export function FeesViewPanel({
  fees = EMPTY_FEES,
}: {
  fees?: FeeSnapshot;
}) {
  const [view, setView] = useState<AnalyticsViewMode>("numbers");

  const feeChart = fees.byMethod.map((row) => ({
    label: row.method,
    value: Math.round(row.feeCents / 100),
  }));
  const hasChartData = feeChart.some((p) => p.value > 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">
          {view === "numbers" ? "This month" : "Fees by payment method"}
        </p>
        <ViewToggle value={view} onChange={setView} />
      </div>

      {view === "numbers" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Gross this month"
            value={formatCompactMoney(fees.grossThisMonthCents)}
            tone="positive"
            animate
            delayMs={0}
            countUpSessionKey={COUNTUP_SESSION_KEYS.reports}
          />
          <MetricCard
            label="Fees this month"
            value={formatCompactMoney(fees.feesThisMonthCents)}
            tone="warning"
            animate
            delayMs={70}
            countUpSessionKey={COUNTUP_SESSION_KEYS.reports}
          />
          <MetricCard
            label="Net this month"
            value={formatCompactMoney(fees.netThisMonthCents)}
            note="after processing fees"
            tone="positive"
            animate
            delayMs={140}
            countUpSessionKey={COUNTUP_SESSION_KEYS.reports}
          />
          <MetricCard
            label="Effective fee rate"
            value={`${fees.effectiveFeeRatePercent}%`}
            tone="muted"
            animate
            delayMs={210}
            countUpSessionKey={COUNTUP_SESSION_KEYS.reports}
          />
        </div>
      ) : hasChartData ? (
        <SimpleBarChart points={feeChart} formatValue={formatChartMoney} />
      ) : (
        <p className="text-sm text-muted">
          Fee breakdown appears after Mindbody imports or when Stripe fee data is
          recorded on payments.
        </p>
      )}

      {view === "numbers" && fees.byMethod.length > 0 ? (
        <div>
          <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-muted uppercase">
            Fees by payment method
          </p>
          <ul className="divide-y divide-border border border-border bg-surface">
            {fees.byMethod.map((row) => (
              <li
                key={row.method}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <span className="font-semibold text-foreground">{row.method}</span>
                <span className="text-muted">
                  Fees {formatCompactMoney(row.feeCents)} · Gross{" "}
                  {formatCompactMoney(row.grossCents)} · {row.effectiveRatePercent}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
