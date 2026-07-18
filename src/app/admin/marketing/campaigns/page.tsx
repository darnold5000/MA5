import type { Metadata } from "next";

import { AdminCampaignsTable } from "@/components/marketing/admin-campaigns-table";
import { MarketingSubnav } from "@/components/marketing/marketing-subnav";
import { getCampaignPerformance } from "@/features/marketing";

export const metadata: Metadata = {
  title: "Campaigns · Marketing",
  robots: { index: false, follow: false },
};

export default async function AdminMarketingCampaignsPage() {
  const rows = await getCampaignPerformance();

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
          Visitors, leads, and members by UTM campaign — reusable Signal Works
          attribution reporting.
        </p>
      </div>

      <MarketingSubnav />
      <AdminCampaignsTable rows={rows} />
    </div>
  );
}
