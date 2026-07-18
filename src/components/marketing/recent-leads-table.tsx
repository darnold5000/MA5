import Link from "next/link";

import type { MarketingLead } from "@/features/marketing/types";

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

export function RecentLeadsTable({ leads }: { leads: MarketingLead[] }) {
  if (leads.length === 0) {
    return (
      <div className="border border-border bg-surface p-6 text-sm text-muted">
        No leads yet. When someone submits the contact form on the MA5 site,
        they will show up here with source and campaign attribution.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-border">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-border bg-surface text-xs tracking-wide text-muted uppercase">
          <tr>
            <th className="px-4 py-3 font-semibold">Name</th>
            <th className="px-4 py-3 font-semibold">Date</th>
            <th className="px-4 py-3 font-semibold">Source</th>
            <th className="px-4 py-3 font-semibold">Campaign</th>
            <th className="px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-border/70">
              <td className="px-4 py-3">
                <Link
                  href={`/admin/marketing/leads?status=${lead.status}`}
                  className="font-medium text-foreground hover:text-brand"
                >
                  {lead.name}
                </Link>
                <p className="text-xs text-muted">{lead.email}</p>
              </td>
              <td className="px-4 py-3 text-muted">
                {formatDate(lead.createdAt)}
              </td>
              <td className="px-4 py-3 text-muted">{lead.utmSource ?? "—"}</td>
              <td className="px-4 py-3 text-muted">
                {lead.utmCampaign ?? "—"}
              </td>
              <td className="px-4 py-3 capitalize text-muted">{lead.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-border px-4 py-3">
        <Link
          href="/admin/marketing/leads"
          className="text-xs font-semibold tracking-wide text-brand uppercase hover:underline"
        >
          View all leads
        </Link>
      </div>
    </div>
  );
}
