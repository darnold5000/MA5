import type { Metadata } from "next";

import { MetricCard } from "@/components/analytics/metric-card";
import { SectionHeader } from "@/components/analytics/ops-panels";
import { SimpleBarChart } from "@/components/analytics/simple-bar-chart";
import { AdminCampaignsTable } from "@/components/marketing/admin-campaigns-table";
import { MarketingSubnav } from "@/components/marketing/marketing-subnav";
import { getMarketingDashboard } from "@/features/marketing";

export const metadata: Metadata = {
  title: "Marketing · Operations",
  robots: { index: false, follow: false },
};

export default async function AdminMarketingDashboardPage() {
  const data = await getMarketingDashboard();

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Growth
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase sm:text-4xl">
          Marketing
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Visitors, campaigns, and leads — which marketing efforts turn into
          members.
        </p>
      </div>

      <MarketingSubnav />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Unique visitors today"
          value={String(data.visitorsToday)}
          note="bots excluded"
        />
        <MetricCard
          label="Unique visitors this month"
          value={String(data.visitorsThisMonth)}
          note="by visitor_id"
        />
        <MetricCard
          label="Page views this month"
          value={String(data.pageViewsThisMonth)}
          note="not unique visitors"
        />
        <MetricCard label="Leads" value={String(data.leads)} />
        <MetricCard
          label="Conversion rate"
          value={`${data.conversionRate}%`}
          note="leads → members"
        />
        <MetricCard
          label="Members acquired"
          value={String(data.membersAcquired)}
        />
        <MetricCard label="Top campaign" value={data.topCampaign ?? "—"} />
      </section>

      <section className="space-y-5">
        <SectionHeader eyebrow="Funnel" title="Lead → member timing" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Lead created"
            value={String(data.funnel.leadsCreated)}
          />
          <MetricCard
            label="Invitation sent"
            value={String(data.funnel.invitationsSent)}
          />
          <MetricCard
            label="Invitation accepted"
            value={String(data.funnel.invitationsAccepted)}
          />
          <MetricCard
            label="Member activated"
            value={String(data.funnel.membersActivated)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard
            label="Avg days lead → invite"
            value={
              data.funnel.avgDaysLeadToInvite != null
                ? String(data.funnel.avgDaysLeadToInvite)
                : "—"
            }
          />
          <MetricCard
            label="Avg days lead → conversion"
            value={
              data.funnel.avgDaysLeadToConversion != null
                ? String(data.funnel.avgDaysLeadToConversion)
                : "—"
            }
          />
        </div>
        <SimpleBarChart points={data.funnel.stages} />
      </section>

      <section className="space-y-5">
        <SectionHeader eyebrow="Traffic" title="Sources" />
        <SimpleBarChart points={data.trafficSources} />
      </section>

      <section className="space-y-5">
        <SectionHeader eyebrow="Trend" title="Unique visitors over time" />
        <SimpleBarChart points={data.visitorsOverTime} />
      </section>

      <section className="space-y-5">
        <SectionHeader eyebrow="Volume" title="Traffic funnel" />
        <SimpleBarChart points={data.leadFunnel} />
      </section>

      <section className="space-y-5">
        <SectionHeader eyebrow="Campaigns" title="Performance" />
        <AdminCampaignsTable rows={data.campaignPerformance.slice(0, 8)} />
      </section>
    </div>
  );
}
