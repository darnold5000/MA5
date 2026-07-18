import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminCampaignsTable } from "@/components/marketing/admin-campaigns-table";
import { GrowthEmptyState } from "@/components/marketing/growth-empty-state";
import { GrowthFilters } from "@/components/marketing/growth-filters";
import { MarketingSubnav } from "@/components/marketing/marketing-subnav";
import {
  getCampaignPerformance,
  getMarketingDashboard,
} from "@/features/marketing";
import { resolveGrowthFilters } from "@/features/marketing/filters";

export const metadata: Metadata = {
  title: "Campaigns · Growth",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminMarketingCampaignsPage({
  searchParams,
}: PageProps) {
  const sp = await searchParams;
  const filters = resolveGrowthFilters({
    range: first(sp.range),
    from: first(sp.from),
    to: first(sp.to),
    source: first(sp.source),
    campaign: first(sp.campaign),
  });
  const [rows, dash] = await Promise.all([
    getCampaignPerformance(filters),
    getMarketingDashboard({
      range: first(sp.range),
      from: first(sp.from),
      to: first(sp.to),
      source: first(sp.source),
      campaign: first(sp.campaign),
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Growth
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase sm:text-4xl">
          Campaigns
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Visitors, leads, and members by UTM campaign from MA5 site data —
          without ad spend or platform ROI.
        </p>
      </div>

      <MarketingSubnav />

      <Suspense fallback={null}>
        <GrowthFilters
          sources={dash.filterSources}
          campaigns={dash.filterCampaigns}
        />
      </Suspense>

      {rows.length === 0 ? (
        <GrowthEmptyState
          title="No campaign data yet"
          body="Share links with utm_campaign (and utm_source / utm_medium when possible). Performance rows appear as visitors and leads are attributed — not from Google Ads or Meta."
        />
      ) : (
        <AdminCampaignsTable rows={rows} />
      )}
    </div>
  );
}
