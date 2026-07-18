import type { Metadata } from "next";
import { Suspense } from "react";

import { MetricCard } from "@/components/analytics/metric-card";
import { SectionHeader } from "@/components/analytics/ops-panels";
import { SimpleBarChart } from "@/components/analytics/simple-bar-chart";
import { ActionNeededSection } from "@/components/marketing/action-needed";
import { AdminCampaignsTable } from "@/components/marketing/admin-campaigns-table";
import { GrowthEmptyState } from "@/components/marketing/growth-empty-state";
import { GrowthFilters } from "@/components/marketing/growth-filters";
import { GrowthScoreCard } from "@/components/marketing/growth-score-card";
import { LeadAgingWidget } from "@/components/marketing/lead-aging";
import { MarketingSubnav } from "@/components/marketing/marketing-subnav";
import { RecentLeadsTable } from "@/components/marketing/recent-leads-table";
import { getMarketingDashboard } from "@/features/marketing";
import {
  growthFiltersToQuery,
  leadsHref,
  resolveGrowthFilters,
} from "@/features/marketing/filters";

export const metadata: Metadata = {
  title: "Growth · Operations",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminMarketingDashboardPage({
  searchParams,
}: PageProps) {
  const sp = await searchParams;
  const filterParams = {
    range: first(sp.range),
    from: first(sp.from),
    to: first(sp.to),
    source: first(sp.source),
    campaign: first(sp.campaign),
  };
  const filters = resolveGrowthFilters(filterParams);
  const data = await getMarketingDashboard(filterParams);
  const leadsListHref = `/admin/marketing/leads${growthFiltersToQuery(filters)}`;

  const hasTraffic = data.trafficSources.some((p) => p.value > 0);
  const hasTrend = data.visitorsOverTime.some((p) => p.value > 0);
  const hasFunnel = data.funnel.leadsCreated > 0;
  const hasCampaigns = data.campaignPerformance.length > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Growth
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase sm:text-4xl">
          Overview
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Morning snapshot of MA5 visitors, leads, invitations, and members —
          from your own site data, not ad platforms.
        </p>
      </div>

      <MarketingSubnav />

      {data.isDemo ? (
        <p className="border border-border bg-surface px-4 py-3 text-sm text-muted">
          Showing sample data until Supabase marketing tables are connected.
          Live metrics appear after visitor tracking and contact-form leads
          start collecting.
        </p>
      ) : null}

      <Suspense fallback={null}>
        <GrowthFilters
          sources={data.filterSources}
          campaigns={data.filterCampaigns}
        />
      </Suspense>

      <GrowthScoreCard score={data.growthScore} />

      <ActionNeededSection items={data.actionNeeded} />

      <section className="grid gap-4 lg:grid-cols-2">
        <LeadAgingWidget aging={data.leadAging} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <MetricCard
            label="Top source"
            value={data.topSource?.name ?? "—"}
            note={
              data.topSource
                ? `${data.topSource.percentOfLeads}% of leads in range`
                : "Appears after leads include utm_source"
            }
          />
          <MetricCard
            label="Top campaign"
            value={data.topCampaign ?? "—"}
            note={
              data.topCampaign
                ? "by visitors in range"
                : "Add UTM campaigns to links"
            }
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader eyebrow="KPIs" title="Core metrics" />
        <p className="text-xs text-muted">
          Today / this month are calendar windows. Leads, conversion, and
          campaign charts use {data.rangeLabel.toLowerCase()}
          {sp.source || sp.campaign ? " with your source/campaign filters" : ""}
          .
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            label="Unique visitors today"
            value={String(data.visitorsToday)}
            note="bots excluded"
          />
          <MetricCard
            label="Unique visitors this month"
            value={String(data.visitorsThisMonth)}
            note="by visitor_id"
            trend={data.trends.visitorsThisMonth}
          />
          <MetricCard
            label="Page views this month"
            value={String(data.pageViewsThisMonth)}
            note="not unique visitors"
          />
          <MetricCard
            label="Leads"
            value={String(data.leads)}
            note={data.rangeLabel}
            href={leadsListHref}
            trend={data.trends.leads}
          />
          <MetricCard
            label="New leads this week"
            value={String(data.newLeadsThisWeek)}
            note="status = new"
            href={leadsHref({ status: "new", range: "7d" })}
            trend={data.trends.newLeadsThisWeek}
          />
          <MetricCard
            label="Leads awaiting follow-up"
            value={String(data.leadsAwaitingFollowUp)}
            note="all new leads"
            href={leadsHref({ status: "new" })}
          />
          <MetricCard
            label="Pending invitations"
            value={String(data.pendingInvitations)}
            note="invite sent, not accepted"
            href="/admin/clients"
          />
          <MetricCard
            label="Invitations not accepted"
            value={String(data.invitationsNotAccepted)}
            note="pending over 7 days"
            href="/admin/clients"
          />
          <MetricCard
            label="Lead → member conversion"
            value={`${data.conversionRate}%`}
            note={`${data.rangeLabel} · MA5 data only`}
            trend={data.trends.conversionRate}
          />
          <MetricCard
            label="Members acquired"
            value={String(data.membersAcquired)}
            note={data.rangeLabel}
            trend={data.trends.membersAcquired}
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader eyebrow="Leads" title="Recent leads" />
        <RecentLeadsTable leads={data.recentLeads} />
      </section>

      <section className="space-y-5">
        <SectionHeader eyebrow="Funnel" title="Lead → member" />
        {hasFunnel ? (
          <>
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
            <SimpleBarChart points={data.leadFunnel} />
          </>
        ) : (
          <GrowthEmptyState
            title="No funnel data yet"
            body="The lead → member funnel fills in after contact-form leads are created and staff send invitations from the Leads or Clients pages."
          />
        )}
      </section>

      <section className="space-y-5">
        <SectionHeader eyebrow="Traffic" title="Sources" />
        {hasTraffic ? (
          <SimpleBarChart points={data.trafficSources} />
        ) : (
          <GrowthEmptyState
            title="No traffic sources yet"
            body="Sources appear when visitors land with UTM parameters (utm_source) or as (direct). The site attribution tracker records this automatically."
          />
        )}
      </section>

      <section className="space-y-5">
        <SectionHeader eyebrow="Trend" title="Unique visitors over time" />
        {hasTrend ? (
          <SimpleBarChart points={data.visitorsOverTime} />
        ) : (
          <GrowthEmptyState
            title="No visitor trend yet"
            body="Daily unique visitors show up after the public site loads with attribution tracking enabled. Bots are excluded."
          />
        )}
      </section>

      <section className="space-y-5">
        <SectionHeader eyebrow="Campaigns" title="Performance" />
        {hasCampaigns ? (
          <AdminCampaignsTable rows={data.campaignPerformance.slice(0, 8)} />
        ) : (
          <GrowthEmptyState
            title="No campaign performance yet"
            body="Share links with utm_campaign (and ideally utm_source / utm_medium). Visitors, leads, and members attributed to those campaigns will appear here — without ad spend or ROI."
          />
        )}
      </section>
    </div>
  );
}
