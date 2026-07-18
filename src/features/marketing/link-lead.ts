import { createServiceClient } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

type AdminClient = ReturnType<typeof createServiceClient>;

/**
 * Resolve a lead for invite/convert flows.
 * Prefer explicit leadId, then case-insensitive email match.
 * Email changes after conversion do not matter — profile.lead_id is authoritative.
 */
export async function resolveLeadIdForEmail(
  admin: AdminClient,
  email: string,
  explicitLeadId?: string | null,
): Promise<string | null> {
  if (explicitLeadId) return explicitLeadId;

  const emailNorm = email.trim().toLowerCase();
  const { data } = await admin
    .from(MA5_TABLES.leads)
    .select("id")
    .ilike("email", emailNorm)
    .neq("status", "closed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

type LeadTouch = {
  id: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  landing_page: string | null;
  referrer: string | null;
  created_at: string;
  invited_at: string | null;
};

/**
 * Attach lead attribution to a profile at invite time (any invite path).
 * Never overwrites acquisition_* (DB trigger also enforces).
 * Sets lead.invited_at when first invited.
 */
export async function attachLeadOnInvite(args: {
  admin: AdminClient;
  profileId: string;
  email: string;
  leadId?: string | null;
  markQualified?: boolean;
}): Promise<{ leadId: string | null }> {
  const leadId = await resolveLeadIdForEmail(
    args.admin,
    args.email,
    args.leadId,
  );
  if (!leadId) return { leadId: null };

  const { data: lead } = await args.admin
    .from(MA5_TABLES.leads)
    .select(
      "id, utm_source, utm_medium, utm_campaign, utm_term, utm_content, landing_page, referrer, created_at, invited_at",
    )
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return { leadId: null };

  const typed = lead as LeadTouch;
  const now = new Date().toISOString();

  const leadPatch: Record<string, unknown> = {
    converted_profile_id: args.profileId,
  };
  if (!typed.invited_at) {
    leadPatch.invited_at = now;
  }
  if (args.markQualified !== false) {
    // Keep converted status if already converted
    const { data: current } = await args.admin
      .from(MA5_TABLES.leads)
      .select("status")
      .eq("id", leadId)
      .maybeSingle();
    if (current?.status !== "converted") {
      leadPatch.status = "qualified";
    }
  }

  await args.admin.from(MA5_TABLES.leads).update(leadPatch).eq("id", leadId);

  const { data: profile } = await args.admin
    .from(MA5_TABLES.profiles)
    .select(
      "lead_id, acquisition_source, acquisition_medium, acquisition_campaign, acquisition_landing_page",
    )
    .eq("id", args.profileId)
    .maybeSingle();

  if (!profile) return { leadId };

  const alreadyAttributed = Boolean(
    profile.acquisition_source ||
      profile.acquisition_medium ||
      profile.acquisition_campaign ||
      profile.acquisition_landing_page,
  );

  const profilePatch: Record<string, unknown> = {};
  if (!profile.lead_id) {
    profilePatch.lead_id = leadId;
  }

  if (!alreadyAttributed) {
    profilePatch.acquisition_source = typed.utm_source;
    profilePatch.acquisition_medium = typed.utm_medium;
    profilePatch.acquisition_campaign = typed.utm_campaign;
    profilePatch.acquisition_term = typed.utm_term;
    profilePatch.acquisition_content = typed.utm_content;
    profilePatch.acquisition_landing_page = typed.landing_page;
    profilePatch.acquisition_referrer = typed.referrer;
    profilePatch.acquisition_first_seen_at = typed.created_at;
  }

  if (Object.keys(profilePatch).length > 0) {
    await args.admin
      .from(MA5_TABLES.profiles)
      .update(profilePatch)
      .eq("id", args.profileId);
  }

  return { leadId };
}
