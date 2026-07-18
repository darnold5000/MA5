import {
  canDeleteLead,
  canDeleteVisitorSession,
} from "@/lib/attribution/first-touch";
import { createServiceClient } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

type AdminClient = ReturnType<typeof createServiceClient>;

export async function deleteAnonymousVisitor(
  admin: AdminClient,
  visitorId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: lead } = await admin
    .from(MA5_TABLES.leads)
    .select("id")
    .eq("visitor_id", visitorId)
    .limit(1)
    .maybeSingle();

  if (!canDeleteVisitorSession(Boolean(lead))) {
    return {
      ok: false,
      error:
        "Visitor is linked to a lead. Delete or close the lead first, or leave attribution intact.",
    };
  }

  const { error } = await admin
    .from(MA5_TABLES.visitorSessions)
    .delete()
    .eq("visitor_id", visitorId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteUnconvertedLead(
  admin: AdminClient,
  leadId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: lead } = await admin
    .from(MA5_TABLES.leads)
    .select("id, status, converted_profile_id")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return { ok: false, error: "Lead not found" };

  let memberActive: boolean | null = null;
  if (lead.converted_profile_id) {
    const { data: profile } = await admin
      .from(MA5_TABLES.profiles)
      .select("active, invitation_status")
      .eq("id", lead.converted_profile_id)
      .maybeSingle();
    memberActive =
      Boolean(profile?.active) && profile?.invitation_status === "accepted";
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

  // Clear profile.lead_id if pointing here (FK is ON DELETE SET NULL, but be explicit)
  if (lead.converted_profile_id) {
    await admin
      .from(MA5_TABLES.profiles)
      .update({ lead_id: null })
      .eq("id", lead.converted_profile_id)
      .eq("lead_id", leadId);
  }

  // Profiles with lead_id only (not converted) — SET NULL via FK
  const { error } = await admin
    .from(MA5_TABLES.leads)
    .delete()
    .eq("id", leadId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function purgeExpiredAnonymousVisitors(
  admin: AdminClient,
  retentionDays = 90,
): Promise<number> {
  const { data, error } = await admin.rpc(
    "ma5_purge_expired_anonymous_visitors",
    { retention_days: retentionDays },
  );
  if (error) {
    console.error("[marketing/purge]", error);
    return 0;
  }
  return typeof data === "number" ? data : 0;
}
