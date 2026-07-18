import type { CampaignRow } from "@/features/marketing/types";

export function AdminCampaignsTable({ rows }: { rows: CampaignRow[] }) {
  return (
    <div className="overflow-x-auto border border-border">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-border bg-surface text-xs tracking-wide text-muted uppercase">
          <tr>
            <th className="px-4 py-3 font-semibold">Campaign</th>
            <th className="px-4 py-3 font-semibold">Source</th>
            <th className="px-4 py-3 font-semibold">Medium</th>
            <th className="px-4 py-3 font-semibold">Visitors</th>
            <th className="px-4 py-3 font-semibold">Leads</th>
            <th className="px-4 py-3 font-semibold">Members</th>
            <th className="px-4 py-3 font-semibold">Conv. %</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-muted">
                No campaign data yet. Share links with UTM parameters to start
                reporting.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={`${row.campaign}-${row.source}-${row.medium}`}
                className="border-b border-border/70"
              >
                <td className="px-4 py-3 text-foreground">{row.campaign}</td>
                <td className="px-4 py-3 text-muted">{row.source ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{row.medium ?? "—"}</td>
                <td className="px-4 py-3 tabular-nums text-muted">
                  {row.visitors}
                </td>
                <td className="px-4 py-3 tabular-nums text-muted">{row.leads}</td>
                <td className="px-4 py-3 tabular-nums text-muted">
                  {row.members}
                </td>
                <td className="px-4 py-3 tabular-nums text-muted">
                  {row.conversionRate}%
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
