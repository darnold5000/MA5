import {
  canDeleteLead,
  canDeleteVisitorSession,
} from "@/lib/attribution/first-touch";
import { isActiveOperationalClient } from "@/lib/auth/member-filters";
import type { ProfileLifecycleRow } from "@/lib/auth/client-lifecycle";
import { MA5_TABLES } from "@/lib/supabase/tables";

import type { MarketingServiceScope } from "./service-scope";
import type { LeadStatus } from "./types";

export async function updateLeadStatus(
  scope: MarketingServiceScope,
  leadId: string,
  status: LeadStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await scope.admin
    .from(MA5_TABLES.leads)
    .update({ status })
    .eq("id", leadId)
    .eq("tenant_id", scope.tenantId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Lead not found" };
  return { ok: true };
}

export async function deleteAnonymousVisitor(
  scope: MarketingServiceScope,
  visitorId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: lead } = await scope.admin
    .from(MA5_TABLES.leads)
    .select("id")
    .eq("visitor_id", visitorId)
    .eq("tenant_id", scope.tenantId)
    .limit(1)
    .maybeSingle();

  if (!canDeleteVisitorSession(Boolean(lead))) {
    return {
      ok: false,
      error:
        "Visitor is linked to a lead. Delete or close the lead first, or leave attribution intact.",
    };
  }

  const { data: deleted, error } = await scope.admin
    .from(MA5_TABLES.visitorSessions)
    .delete()
    .eq("visitor_id", visitorId)
    .eq("tenant_id", scope.tenantId)
    .select("visitor_id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!deleted) return { ok: false, error: "Visitor session not found" };
  return { ok: true };
}

export async function deleteUnconvertedLead(
  scope: MarketingServiceScope,
  leadId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: lead } = await scope.admin
    .from(MA5_TABLES.leads)
    .select("id, status, converted_profile_id")
    .eq("id", leadId)
    .eq("tenant_id", scope.tenantId)
    .maybeSingle();

  if (!lead) return { ok: false, error: "Lead not found" };

  let memberActive: boolean | null = null;
  if (lead.converted_profile_id) {
    const { data: profile } = await scope.admin
      .from(MA5_TABLES.profiles)
      .select(
        "active, invitation_status, client_status, deleted_at, access_revoked_at, invitation_accepted_at",
      )
      .eq("id", lead.converted_profile_id)
      .eq("tenant_id", scope.tenantId)
      .maybeSingle();
    memberActive = isActiveOperationalClient(profile as ProfileLifecycleRow);
  }

  if (
    !canDeleteLead({
      status: lead.status,
      convertedProfileId: lead.converted_profile_id,
      memberActive,
    })
  ) {
    return {
      ok: false,
      error:
        "Cannot delete a converted lead linked to an active member. Attribution is retained on the member profile.",
    };
  }

  if (lead.converted_profile_id) {
    await scope.admin
      .from(MA5_TABLES.profiles)
      .update({ lead_id: null })
      .eq("id", lead.converted_profile_id)
      .eq("lead_id", leadId)
      .eq("tenant_id", scope.tenantId);
  }

  const { data: removed, error } = await scope.admin
    .from(MA5_TABLES.leads)
    .delete()
    .eq("id", leadId)
    .eq("tenant_id", scope.tenantId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!removed) return { ok: false, error: "Lead not found" };
  return { ok: true };
}

/**
 * Tenant-scoped purge of expired anonymous visitors (no linked lead).
 * Does not call the global ma5_purge_expired_anonymous_visitors RPC.
 */
export async function purgeExpiredAnonymousVisitors(
  scope: MarketingServiceScope,
  retentionDays = 90,
): Promise<number> {
  if (retentionDays < 1) return 0;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const cutoffIso = cutoff.toISOString();

  const { data: sessions, error: listError } = await scope.admin
    .from(MA5_TABLES.visitorSessions)
    .select("visitor_id")
    .eq("tenant_id", scope.tenantId)
    .lt("last_seen", cutoffIso);

  if (listError) {
    console.error("[marketing/purge]", listError);
    return 0;
  }

  const visitorIds = (sessions ?? []).map((row) => String(row.visitor_id));
  if (visitorIds.length === 0) return 0;

  const { data: linkedLeads, error: leadsError } = await scope.admin
    .from(MA5_TABLES.leads)
    .select("visitor_id")
    .eq("tenant_id", scope.tenantId)
    .in("visitor_id", visitorIds);

  if (leadsError) {
    console.error("[marketing/purge] lead lookup", leadsError);
    return 0;
  }

  const linked = new Set(
    (linkedLeads ?? []).map((row) => String(row.visitor_id)),
  );
  const toDelete = visitorIds.filter((id) => !linked.has(id));
  if (toDelete.length === 0) return 0;

  const { data: deleted, error: deleteError } = await scope.admin
    .from(MA5_TABLES.visitorSessions)
    .delete()
    .eq("tenant_id", scope.tenantId)
    .in("visitor_id", toDelete)
    .select("visitor_id");

  if (deleteError) {
    console.error("[marketing/purge] delete", deleteError);
    return 0;
  }

  return deleted?.length ?? 0;
}
