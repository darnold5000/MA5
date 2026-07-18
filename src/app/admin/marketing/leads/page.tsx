import type { Metadata } from "next";

import { AdminLeadsTable } from "@/components/marketing/admin-leads-table";
import { MarketingSubnav } from "@/components/marketing/marketing-subnav";
import { listMarketingLeads } from "@/features/marketing";

export const metadata: Metadata = {
  title: "Leads · Marketing",
  robots: { index: false, follow: false },
};

export default async function AdminMarketingLeadsPage() {
  const leads = await listMarketingLeads();

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
          Contact form submissions with campaign attribution. Filter by source,
          campaign, or status.
        </p>
      </div>

      <MarketingSubnav />
      <AdminLeadsTable leads={leads} />
    </div>
  );
}
