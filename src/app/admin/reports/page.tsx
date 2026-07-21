import type { Metadata } from "next";
import Link from "next/link";

import { MetricCard } from "@/components/analytics/metric-card";
import { COUNTUP_SESSION_KEYS } from "@/components/analytics/metric-tone";
import { FeesViewPanel } from "@/components/analytics/fees-view-panel";
import { MetricsViewPanel } from "@/components/analytics/metrics-view-panel";
import {
  ActivityFeed,
  CapacityList,
  SectionHeader,
  TopPrograms,
} from "@/components/analytics/ops-panels";
import { PaymentImportPanel } from "@/components/admin/payment-import-panel";
import { EMPTY_FEES, getBusinessReports } from "@/features/analytics";

export const metadata: Metadata = {
  title: "Reports · Operations",
  robots: { index: false, follow: false },
};

const reportsCountUp = COUNTUP_SESSION_KEYS.reports;

export default async function AdminReportsPage() {
  const data = await getBusinessReports();
  const { memberships, attendance, payments } = data;
  const fees = data.fees ?? EMPTY_FEES;

  return (
    <div className="mx-auto max-w-5xl space-y-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
            Operations
          </p>
          <h1 className="mt-1 font-display text-3xl tracking-wide uppercase sm:text-4xl">
            Reports
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Bookings, revenue, memberships, and capacity — how the business is
            trending without the noise.
          </p>
        </div>
        <Link
          href="/admin"
          className="inline-flex min-h-11 items-center border border-border px-4 text-xs font-semibold tracking-wide uppercase transition hover:border-brand"
        >
          ← Daily ops
        </Link>
      </div>

      {data.isDemo ? (
        <p className="border border-border bg-surface px-4 py-3 text-sm text-muted">
          Showing sample data until Supabase is connected. Revenue and business
          metrics here reflect live Stripe payments once checkout is enabled.
        </p>
      ) : null}

      <PaymentImportPanel />

      <section className="space-y-5">
        <SectionHeader eyebrow="Money" title="Revenue" />
        <MetricsViewPanel
          metrics={data.revenuePeriods}
          chartPoints={data.revenueChart}
          columns={5}
          chartFormat="money"
          numbersLabel="By period"
          chartLabel="Revenue by month (YTD)"
        />
      </section>

      <section className="space-y-5">
        <SectionHeader eyebrow="Processing" title="Fees & net revenue" />
        <FeesViewPanel fees={fees} />
      </section>

      <section className="space-y-5">
        <SectionHeader eyebrow="Schedule" title="Bookings" />
        <MetricsViewPanel
          metrics={data.bookingPeriods}
          chartPoints={data.bookingsChart}
          numbersLabel="By period"
          chartLabel="Bookings this week (by day)"
        />
      </section>

      <section className="space-y-5">
        <SectionHeader eyebrow="Members" title="Memberships" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Active"
            value={String(memberships.active)}
            animate
            delayMs={0}
            countUpSessionKey={reportsCountUp}
          />
          <MetricCard
            label="New this month"
            value={String(memberships.newThisMonth)}
            tone="positive"
            animate
            delayMs={70}
            countUpSessionKey={reportsCountUp}
          />
          <MetricCard
            label="Cancelled"
            value={String(memberships.cancelled)}
            tone={memberships.cancelled > 0 ? "negative" : "muted"}
            animate
            delayMs={140}
            countUpSessionKey={reportsCountUp}
          />
          <MetricCard
            label="Net growth"
            value={`${memberships.netGrowth >= 0 ? "+" : ""}${memberships.netGrowth}`}
            note={`${memberships.atRisk} at risk · ${memberships.expired} expired`}
            tone={memberships.netGrowth >= 0 ? "positive" : "negative"}
            animate
            delayMs={210}
            countUpSessionKey={reportsCountUp}
          />
        </div>
      </section>

      <section className="space-y-5">
        <SectionHeader eyebrow="Show-up" title="Attendance" />
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            label="Attendance %"
            value={`${attendance.ratePercent}%`}
            tone={attendance.ratePercent >= 80 ? "positive" : "warning"}
            animate
            delayMs={0}
            countUpSessionKey={reportsCountUp}
          />
          <MetricCard
            label="Missed sessions"
            value={String(attendance.missedSessions)}
            note="last 30 days"
            tone={attendance.missedSessions > 0 ? "warning" : "muted"}
            animate
            delayMs={70}
            countUpSessionKey={reportsCountUp}
          />
          <MetricCard
            label="Avg attendance"
            value={String(attendance.averageAttendance)}
            note="per session"
            animate
            delayMs={140}
            countUpSessionKey={reportsCountUp}
          />
        </div>
      </section>

      <CapacityList
        rows={data.capacity}
        averagePercent={data.averageCapacityPercent}
      />

      <TopPrograms programs={data.topPrograms} />

      <section className="space-y-5">
        <SectionHeader eyebrow="Billing" title="Payments" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Successful"
            value={String(payments.successful)}
            note="this month"
            tone="positive"
            animate
            delayMs={0}
            countUpSessionKey={reportsCountUp}
          />
          <MetricCard
            label="Failed"
            value={String(payments.failed)}
            note="need follow-up"
            tone={payments.failed > 0 ? "negative" : "muted"}
            animate
            delayMs={70}
            countUpSessionKey={reportsCountUp}
          />
          <MetricCard
            label="Outstanding"
            value={`$${(payments.outstandingCents / 100).toFixed(0)}`}
            tone={payments.outstandingCents > 0 ? "warning" : "muted"}
            animate
            delayMs={140}
            countUpSessionKey={reportsCountUp}
          />
          <MetricCard
            label="Refunds"
            value={String(payments.refunds)}
            tone={payments.refunds > 0 ? "warning" : "muted"}
            animate
            delayMs={210}
            countUpSessionKey={reportsCountUp}
          />
        </div>
      </section>

      <section className="space-y-5">
        <SectionHeader eyebrow="At a glance" title="Key metrics" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.kpis.map((k) => (
            <MetricCard
              key={k.id}
              label={k.label}
              value={k.value}
              tone={
                k.label.toLowerCase().includes("failed")
                  ? "negative"
                  : k.label.toLowerCase().includes("revenue") ||
                      k.label.toLowerCase().includes("successful")
                    ? "positive"
                    : "default"
              }
            />
          ))}
        </div>
      </section>

      <ActivityFeed items={data.activity} />
    </div>
  );
}
