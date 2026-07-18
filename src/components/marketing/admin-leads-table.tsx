"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { LeadStatus, MarketingLead } from "@/features/marketing/types";

const STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "converted",
  "closed",
];

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

export function AdminLeadsTable({ leads }: { leads: MarketingLead[] }) {
  const router = useRouter();
  const [source, setSource] = useState("all");
  const [campaign, setCampaign] = useState("all");
  const [status, setStatus] = useState<LeadStatus | "all">("all");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const sources = useMemo(
    () =>
      [...new Set(leads.map((l) => l.utmSource).filter(Boolean) as string[])].sort(),
    [leads],
  );
  const campaigns = useMemo(
    () =>
      [
        ...new Set(leads.map((l) => l.utmCampaign).filter(Boolean) as string[]),
      ].sort(),
    [leads],
  );

  const filtered = leads.filter((lead) => {
    if (source !== "all" && lead.utmSource !== source) return false;
    if (campaign !== "all" && lead.utmCampaign !== campaign) return false;
    if (status !== "all" && lead.status !== status) return false;
    return true;
  });

  async function updateStatus(leadId: string, next: LeadStatus) {
    setPendingId(leadId);
    await fetch("/api/admin/marketing/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, status: next }),
    });
    setPendingId(null);
    router.refresh();
  }

  async function inviteLead(lead: MarketingLead) {
    if (
      !window.confirm(
        `Invite ${lead.name} (${lead.email}) as a client member?`,
      )
    ) {
      return;
    }
    setPendingId(lead.id);
    await fetch("/api/admin/members/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: lead.name,
        email: lead.email,
        phone: lead.phone ?? undefined,
        role: "client",
        leadId: lead.id,
      }),
    });
    setPendingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <label className="text-xs">
          <span className="mb-1 block font-semibold tracking-wide text-muted uppercase">
            Source
          </span>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="min-h-11 border border-border bg-surface px-3 text-sm"
          >
            <option value="all">All</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="mb-1 block font-semibold tracking-wide text-muted uppercase">
            Campaign
          </span>
          <select
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            className="min-h-11 border border-border bg-surface px-3 text-sm"
          >
            <option value="all">All</option>
            {campaigns.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="mb-1 block font-semibold tracking-wide text-muted uppercase">
            Status
          </span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as LeadStatus | "all")}
            className="min-h-11 border border-border bg-surface px-3 text-sm"
          >
            <option value="all">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto border border-border">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-surface text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Source</th>
              <th className="px-4 py-3 font-semibold">Campaign</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Converted</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-muted">
                  No leads match these filters.
                </td>
              </tr>
            ) : (
              filtered.map((lead) => (
                <tr key={lead.id} className="border-b border-border/70">
                  <td className="px-4 py-3 text-foreground">{lead.name}</td>
                  <td className="px-4 py-3 text-muted">{lead.email}</td>
                  <td className="px-4 py-3 text-muted">
                    {formatDate(lead.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {lead.utmSource ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {lead.utmCampaign ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.status}
                      disabled={pendingId === lead.id}
                      onChange={(e) =>
                        void updateStatus(lead.id, e.target.value as LeadStatus)
                      }
                      className="border border-border bg-background px-2 py-1.5 text-xs capitalize"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {lead.status === "converted" || lead.convertedProfileId
                      ? "Yes"
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {lead.status !== "converted" &&
                    !lead.convertedProfileId &&
                    /^[0-9a-f-]{36}$/i.test(lead.id) ? (
                      <button
                        type="button"
                        disabled={pendingId === lead.id}
                        onClick={() => void inviteLead(lead)}
                        className="text-xs font-semibold tracking-wide text-brand uppercase hover:underline disabled:opacity-50"
                      >
                        Invite
                      </button>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
