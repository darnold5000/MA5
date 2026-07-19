"use client";

import { useState } from "react";
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

export function AdminLeadsTable({
  leads,
  emptyHint,
}: {
  leads: MarketingLead[];
  emptyHint?: string;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    tone: "ok" | "err";
    text: string;
  } | null>(null);

  async function updateStatus(leadId: string, next: LeadStatus) {
    setPendingId(leadId);
    setMessage(null);
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
    setMessage(null);
    const res = await fetch("/api/admin/members/invite", {
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
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      ok?: boolean;
    };
    setPendingId(null);
    if (!res.ok) {
      setMessage({
        tone: "err",
        text: data.error ?? "Invite failed. Try again.",
      });
      return;
    }
    setMessage({
      tone: "ok",
      text: `Invite sent to ${lead.email}. They should receive an activation email shortly.`,
    });
    router.refresh();
  }

  async function deleteLead(lead: MarketingLead) {
    if (
      !window.confirm(
        `Permanently delete lead ${lead.name}? This only works for unconverted leads and will not remove member acquisition fields.`,
      )
    ) {
      return;
    }
    setPendingId(lead.id);
    const res = await fetch("/api/admin/marketing/privacy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_lead", leadId: lead.id }),
    });
    setPendingId(null);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      window.alert(data.error ?? "Could not delete lead");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {message ? (
        <p
          role="status"
          className={
            message.tone === "ok"
              ? "border border-border bg-surface px-4 py-3 text-sm text-foreground"
              : "border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-foreground"
          }
        >
          {message.text}
        </p>
      ) : null}
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
            {leads.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-muted">
                  {emptyHint ??
                    "No leads match these filters yet. Contact-form submissions appear here with UTM attribution when present."}
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
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
                    /^[0-9a-f-]{36}$/i.test(lead.id) ? (
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          disabled={pendingId === lead.id}
                          onClick={() => void inviteLead(lead)}
                          className="text-left text-xs font-semibold tracking-wide text-brand uppercase hover:underline disabled:opacity-50"
                        >
                          Invite
                        </button>
                        <button
                          type="button"
                          disabled={pendingId === lead.id}
                          onClick={() => void deleteLead(lead)}
                          className="text-left text-xs font-semibold tracking-wide text-muted uppercase hover:text-brand disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
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
