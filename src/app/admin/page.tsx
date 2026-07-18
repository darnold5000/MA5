import type { Metadata } from "next";
import Link from "next/link";

import { HealthSnapshot } from "@/components/analytics/health-snapshot";
import { OverviewGrid } from "@/components/analytics/metric-card";
import {
  RecentMessages,
  RecentPayments,
  RecentSignups,
  TodaySchedule,
} from "@/components/analytics/ops-panels";
import { AthletesNeedingAttention } from "@/components/programs/athletes-needing-attention";
import { DEMO_DAILY_OPS } from "@/features/analytics";
import { listCoachAttentionAlerts } from "@/features/programs/queries";
import {
  formatCalendarDate,
  greetingForNow,
} from "@/features/scheduling/format";

export const metadata: Metadata = {
  title: "Operations",
  robots: { index: false, follow: false },
};

export default async function OperationsHomePage() {
  const data = DEMO_DAILY_OPS;
  const attention = await listCoachAttentionAlerts();

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            {greetingForNow()}, Mike · {formatCalendarDate()}
          </p>
          <h1 className="mt-2 font-display text-3xl tracking-wide uppercase sm:text-4xl">
            Daily ops
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Today&apos;s schedule, revenue, attendance, messages, and payment
            alerts — everything actionable this morning.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/marketing"
            className="inline-flex min-h-11 items-center border border-border px-4 text-xs font-semibold tracking-wide uppercase transition hover:border-brand"
          >
            Marketing →
          </Link>
          <Link
            href="/admin/reports"
            className="inline-flex min-h-11 items-center border border-border px-4 text-xs font-semibold tracking-wide uppercase transition hover:border-brand"
          >
            Business reports →
          </Link>
        </div>
      </div>

      <HealthSnapshot metrics={data.health} animate />

      <AthletesNeedingAttention alerts={attention} />

      <section>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Business overview
        </p>
        <div className="mt-4">
          <OverviewGrid metrics={data.overview} animate />
        </div>
      </section>

      <TodaySchedule rows={data.schedule} />

      <div className="grid gap-10 lg:grid-cols-2">
        <RecentPayments rows={data.payments} />
        <RecentSignups rows={data.signups} />
      </div>

      <RecentMessages rows={data.messages} />
    </div>
  );
}
