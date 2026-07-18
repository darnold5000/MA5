import { attachLeadOnInvite } from "@/features/marketing/link-lead";
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
 * Never overwrites acquisition_* once set (app + DB trigger).
 *
 * Email changes after conversion do not clear attribution — profile.lead_id
 * and acquisition_* remain the source of truth.
 */
export async function applyAttributionToMember(
  args: ConvertArgs,
): Promise<{ leadId: string | null }> {
  const admin = createServiceClient();

  // Prefer lead link paths (explicit id → email → visitor)
  const attached = await attachLeadOnInvite({
    admin,
    profileId: args.profileId,
    email: args.email,
    leadId: args.leadId,
    markQualified: false,
  });

  let leadId = attached.leadId;

  if (!leadId && args.visitorId) {
    const { data: byVisitor } = await admin
      .from(MA5_TABLES.leads)
      .select("id")
      .eq("visitor_id", args.visitorId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (byVisitor?.id) {
      const retry = await attachLeadOnInvite({
        admin,
        profileId: args.profileId,
        email: args.email,
        leadId: byVisitor.id,
        markQualified: false,
      });
      leadId = retry.leadId;
    }
  }

  if (leadId) {
    await admin
      .from(MA5_TABLES.leads)
      .update({
        status: "converted",
        converted_profile_id: args.profileId,
        converted_at: new Date().toISOString(),
      })
      .eq("id", leadId);
  }

  const { data: profile } = await admin
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

  if (alreadyAttributed) {
    return { leadId: leadId ?? profile.lead_id };
  }

  // Fallback: cookie / visitor session when no lead exists yet
  const touch = args.firstTouch;
  const patch: Record<string, string | null> = {
    lead_id: leadId ?? profile.lead_id,
    acquisition_source: touch?.utmSource ?? null,
    acquisition_medium: touch?.utmMedium ?? null,
    acquisition_campaign: touch?.utmCampaign ?? null,
    acquisition_term: touch?.utmTerm ?? null,
    acquisition_content: touch?.utmContent ?? null,
    acquisition_landing_page: touch?.landingPage ?? null,
    acquisition_referrer: touch?.referrer ?? null,
    acquisition_first_seen_at: touch?.capturedAt ?? null,
  };

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

  const hasAny = Object.values(patch).some((v) => v != null && v !== "");
  if (hasAny) {
    await admin.from(MA5_TABLES.profiles).update(patch).eq("id", args.profileId);
  }

  return { leadId: leadId ?? profile.lead_id };
}
