import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminLeadsTable } from "@/components/marketing/admin-leads-table";
import { GrowthFilters } from "@/components/marketing/growth-filters";
import { MarketingSubnav } from "@/components/marketing/marketing-subnav";
import { listMarketingLeads, getMarketingDashboard } from "@/features/marketing";
import {
  resolveGrowthFilters,
  type GrowthSearchParams,
} from "@/features/marketing/filters";
import type { LeadStatus } from "@/features/marketing/types";

export const metadata: Metadata = {
  title: "Leads · Growth",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "converted",
  "closed",
];

function asLeadStatus(value: string | undefined): LeadStatus | "all" {
  if (value && (LEAD_STATUSES as string[]).includes(value)) {
    return value as LeadStatus;
  }
  return "all";
}

export default async function AdminMarketingLeadsPage({
  searchParams,
}: PageProps) {
  const sp = await searchParams;
  const params: GrowthSearchParams = {
    range: first(sp.range),
    from: first(sp.from),
    to: first(sp.to),
    source: first(sp.source),
    campaign: first(sp.campaign),
    status: first(sp.status),
  };
  const filters = resolveGrowthFilters(params);
  const status = asLeadStatus(params.status);

  const [leads, dash] = await Promise.all([
    listMarketingLeads({
      source: filters.source,
      campaign: filters.campaign,
      status,
      from: filters.from,
      to: filters.to,
    }),
    getMarketingDashboard(params),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Growth
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase sm:text-4xl">
          Leads
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Contact form submissions with MA5 campaign attribution. Filter by
          date, source, campaign, or status.
        </p>
      </div>

      <MarketingSubnav />

      <Suspense fallback={null}>
        <GrowthFilters
          sources={dash.filterSources}
          campaigns={dash.filterCampaigns}
          showStatus
        />
      </Suspense>

      <AdminLeadsTable
        leads={leads}
        emptyHint={
          leads.length === 0
            ? "No leads match these filters yet. New contact-form submissions appear here automatically with UTM source and campaign when present."
            : undefined
        }
      />
    </div>
  );
}
