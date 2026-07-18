import type { AttributionTouch } from "@/lib/attribution/types";
import { createServiceClient } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

type ConvertArgs = {
  profileId: string;
  email: string;
  visitorId?: string | null;
  firstTouch?: AttributionTouch | null;
  leadId?: string | null;
};

/**
 * Carry first-touch attribution onto a member profile after conversion.
 * Never overwrites acquisition_* once set.
 */
export async function applyAttributionToMember(
  args: ConvertArgs,
): Promise<{ leadId: string | null }> {
  const admin = createServiceClient();
  const emailNorm = args.email.trim().toLowerCase();

  const { data: profile } = await admin
    .from(MA5_TABLES.profiles)
    .select(
      "id, lead_id, acquisition_source, acquisition_medium, acquisition_campaign, acquisition_landing_page",
    )
    .eq("id", args.profileId)
    .maybeSingle();

  if (!profile) return { leadId: null };

  let leadId = args.leadId ?? profile.lead_id ?? null;
  let lead: {
    id: string;
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    utm_term: string | null;
    utm_content: string | null;
    landing_page: string | null;
    referrer: string | null;
    created_at: string;
    visitor_id: string | null;
  } | null = null;

  if (leadId) {
    const { data } = await admin
      .from(MA5_TABLES.leads)
      .select(
        "id, utm_source, utm_medium, utm_campaign, utm_term, utm_content, landing_page, referrer, created_at, visitor_id",
      )
      .eq("id", leadId)
      .maybeSingle();
    lead = data;
  }

  if (!lead) {
    let q = admin
      .from(MA5_TABLES.leads)
      .select(
        "id, utm_source, utm_medium, utm_campaign, utm_term, utm_content, landing_page, referrer, created_at, visitor_id",
      )
      .ilike("email", emailNorm)
      .neq("status", "closed")
      .order("created_at", { ascending: false })
      .limit(1);

    const { data: byEmail } = await q.maybeSingle();
    lead = byEmail;

    if (!lead && args.visitorId) {
      const { data: byVisitor } = await admin
        .from(MA5_TABLES.leads)
        .select(
          "id, utm_source, utm_medium, utm_campaign, utm_term, utm_content, landing_page, referrer, created_at, visitor_id",
        )
        .eq("visitor_id", args.visitorId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      lead = byVisitor;
    }
  }

  if (lead) {
    leadId = lead.id;
    await admin
      .from(MA5_TABLES.leads)
      .update({
        status: "converted",
        converted_profile_id: args.profileId,
        converted_at: new Date().toISOString(),
      })
      .eq("id", lead.id);
  }

  const alreadyAttributed = Boolean(
    profile.acquisition_source ||
      profile.acquisition_medium ||
      profile.acquisition_campaign ||
      profile.acquisition_landing_page,
  );

  if (!alreadyAttributed) {
    const touch = args.firstTouch;
    const patch: Record<string, string | null> = {
      lead_id: leadId,
      acquisition_source: lead?.utm_source ?? touch?.utmSource ?? null,
      acquisition_medium: lead?.utm_medium ?? touch?.utmMedium ?? null,
      acquisition_campaign: lead?.utm_campaign ?? touch?.utmCampaign ?? null,
      acquisition_term: lead?.utm_term ?? touch?.utmTerm ?? null,
      acquisition_content: lead?.utm_content ?? touch?.utmContent ?? null,
      acquisition_landing_page:
        lead?.landing_page ?? touch?.landingPage ?? null,
      acquisition_referrer: lead?.referrer ?? touch?.referrer ?? null,
      acquisition_first_seen_at:
        lead?.created_at ?? touch?.capturedAt ?? new Date().toISOString(),
    };

    // If we only have a visitor session, pull first-touch from there
    if (
      !patch.acquisition_source &&
      !patch.acquisition_landing_page &&
      args.visitorId
    ) {
      const { data: session } = await admin
        .from(MA5_TABLES.visitorSessions)
        .select(
          "utm_source, utm_medium, utm_campaign, utm_term, utm_content, landing_page, referrer, first_seen",
        )
        .eq("visitor_id", args.visitorId)
        .maybeSingle();

      if (session) {
        patch.acquisition_source = session.utm_source;
        patch.acquisition_medium = session.utm_medium;
        patch.acquisition_campaign = session.utm_campaign;
        patch.acquisition_term = session.utm_term;
        patch.acquisition_content = session.utm_content;
        patch.acquisition_landing_page = session.landing_page;
        patch.acquisition_referrer = session.referrer;
        patch.acquisition_first_seen_at = session.first_seen;
      }
    }

    await admin.from(MA5_TABLES.profiles).update(patch).eq("id", args.profileId);
  } else if (leadId && !profile.lead_id) {
    await admin
      .from(MA5_TABLES.profiles)
      .update({ lead_id: leadId })
      .eq("id", args.profileId);
  }

  return { leadId };
}
