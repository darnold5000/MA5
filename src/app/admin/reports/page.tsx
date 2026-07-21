import type { Metadata } from "next";
import Link from "next/link";

import { MetricCard, PeriodGrid } from "@/components/analytics/metric-card";
import {
  ActivityFeed,
  CapacityList,
  SectionHeader,
  TopPrograms,
} from "@/components/analytics/ops-panels";
import { SimpleBarChart } from "@/components/analytics/simple-bar-chart";
import { PaymentImportPanel } from "@/components/admin/payment-import-panel";
import { formatCompactMoney, getBusinessReports } from "@/features/analytics";

export const metadata: Metadata = {
  title: "Reports · Operations",
  robots: { index: false, follow: false },
};

function formatChartMoney(value: number): string {
  if (value >= 1000) return `$${Math.round(value / 1000)}k`;
  return `$${value}`;
}

export default async function AdminReportsPage() {
  const data = await getBusinessReports();
  const { memberships, attendance, payments, fees } = data;

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
        <PeriodGrid metrics={data.revenuePeriods} columns={5} />
        <div>
          <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-muted uppercase">
            Revenue over time
          </p>
          <SimpleBarChart
            points={data.revenueChart}
            formatValue={formatChartMoney}
          />
        </div>
      </section>

      <section className="space-y-5">
        <SectionHeader eyebrow="Processing" title="Fees & net revenue" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Gross this month"
            value={formatCompactMoney(fees.grossThisMonthCents)}
          />
          <MetricCard
            label="Fees this month"
            value={formatCompactMoney(fees.feesThisMonthCents)}
          />
          <MetricCard
            label="Net this month"
            value={formatCompactMoney(fees.netThisMonthCents)}
            note="after processing fees"
          />
          <MetricCard
            label="Effective fee rate"
            value={`${fees.effectiveFeeRatePercent}%`}
          />
        </div>
        {fees.byMethod.length > 0 ? (
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
                  <span className="font-semibold text-foreground">
                    {row.method}
                  </span>
                  <span className="text-muted">
                    Fees {formatCompactMoney(row.feeCents)} · Gross{" "}
                    {formatCompactMoney(row.grossCents)} · {row.effectiveRatePercent}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Fee breakdown appears after Mindbody imports or when Stripe fee data
            is recorded on payments.
          </p>
        )}
      </section>

      <section className="space-y-5">
        <SectionHeader eyebrow="Schedule" title="Bookings" />
        <PeriodGrid metrics={data.bookingPeriods} />
        <div>
          <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-muted uppercase">
            Bookings this week
          </p>
          <SimpleBarChart points={data.bookingsChart} />
        </div>
      </section>

      <section className="space-y-5">
        <SectionHeader eyebrow="Members" title="Memberships" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Active" value={String(memberships.active)} />
          <MetricCard
            label="New this month"
            value={String(memberships.newThisMonth)}
          />
          <MetricCard
            label="Cancelled"
            value={String(memberships.cancelled)}
          />
          <MetricCard
            label="Net growth"
            value={`+${memberships.netGrowth}`}
            note={`${memberships.atRisk} at risk · ${memberships.expired} expired`}
          />
        </div>
      </section>

      <section className="space-y-5">
        <SectionHeader eyebrow="Show-up" title="Attendance" />
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            label="Attendance %"
            value={`${attendance.ratePercent}%`}
          />
          <MetricCard
            label="Missed sessions"
            value={String(attendance.missedSessions)}
            note="last 30 days"
          />
          <MetricCard
            label="Avg attendance"
            value={String(attendance.averageAttendance)}
            note="per session"
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
          />
          <MetricCard
            label="Failed"
            value={String(payments.failed)}
            note="need follow-up"
          />
          <MetricCard
            label="Outstanding"
            value={`$${(payments.outstandingCents / 100).toFixed(0)}`}
          />
          <MetricCard label="Refunds" value={String(payments.refunds)} />
        </div>
      </section>

      <section className="space-y-5">
        <SectionHeader eyebrow="At a glance" title="Key metrics" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.kpis.map((k) => (
            <MetricCard key={k.id} label={k.label} value={k.value} />
          ))}
        </div>
      </section>

      <ActivityFeed items={data.activity} />
    </div>
  );
}
