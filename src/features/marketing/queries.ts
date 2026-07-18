import {
  DEMO_CAMPAIGNS,
  DEMO_LEADS,
  DEMO_MARKETING_DASHBOARD,
  DEMO_MEMBER_ATTRIBUTION,
} from "@/features/marketing/demo-data";
import {
  leadsHref,
  rangeLabel,
  resolveGrowthFilters,
  type GrowthFilters,
  type GrowthSearchParams,
} from "@/features/marketing/filters";
import { buildFunnelReport } from "@/features/marketing/funnel";
import type {
  ActionNeededItem,
  CampaignRow,
  LeadStatus,
  MarketingDashboard,
  MarketingLead,
  MemberAttribution,
} from "@/features/marketing/types";
import { isSupabasePublicConfigured } from "@/lib/env";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

type LeadRow = {
  id: string;
  visitor_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  landing_page: string | null;
  referrer: string | null;
  status: LeadStatus;
  converted_profile_id: string | null;
  converted_at: string | null;
  invited_at?: string | null;
  created_at: string;
};

function mapLead(row: LeadRow): MarketingLead {
  return {
    id: row.id,
    visitorId: row.visitor_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    message: row.message,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    utmTerm: row.utm_term,
    utmContent: row.utm_content,
    landingPage: row.landing_page,
    referrer: row.referrer,
    status: row.status,
    convertedProfileId: row.converted_profile_id,
    convertedAt: row.converted_at,
    invitedAt: row.invited_at ?? null,
    createdAt: row.created_at,
  };
}

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonthIso(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfWeekIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 6);
  return d.toISOString();
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export type LeadFilters = {
  source?: string;
  campaign?: string;
  status?: LeadStatus | "all";
  from?: string;
  to?: string;
};

export async function listMarketingLeads(
  filters: LeadFilters = {},
): Promise<MarketingLead[]> {
  if (!isSupabasePublicConfigured() || !isSupabaseConfigured()) {
    return filterDemoLeads(DEMO_LEADS, filters);
  }

  try {
    const supabase = await createClient();
    let query = supabase
      .from(MA5_TABLES.leads)
      .select(
        "id, visitor_id, name, email, phone, message, utm_source, utm_medium, utm_campaign, utm_term, utm_content, landing_page, referrer, status, converted_profile_id, converted_at, invited_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (filters.source) query = query.eq("utm_source", filters.source);
    if (filters.campaign) query = query.eq("utm_campaign", filters.campaign);
    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }
    if (filters.from) query = query.gte("created_at", filters.from);
    if (filters.to) query = query.lte("created_at", filters.to);

    const { data, error } = await query;
    if (error) {
      console.error("[marketing/listLeads]", error);
      return filterDemoLeads(DEMO_LEADS, filters);
    }
    return (data as LeadRow[]).map(mapLead);
  } catch (err) {
    console.error("[marketing/listLeads]", err);
    return filterDemoLeads(DEMO_LEADS, filters);
  }
}

function filterDemoLeads(
  leads: MarketingLead[],
  filters: LeadFilters,
): MarketingLead[] {
  return leads.filter((lead) => {
    if (filters.source && lead.utmSource !== filters.source) return false;
    if (filters.campaign && lead.utmCampaign !== filters.campaign) return false;
    if (
      filters.status &&
      filters.status !== "all" &&
      lead.status !== filters.status
    ) {
      return false;
    }
    if (filters.from && lead.createdAt < filters.from) return false;
    if (filters.to && lead.createdAt > filters.to) return false;
    return true;
  });
}

function buildActionNeeded(args: {
  newLeads: number;
  notContacted: number;
  pendingInvites: number;
  staleInvites: number;
  awaitingActivation: number;
}): ActionNeededItem[] {
  const items: ActionNeededItem[] = [
    {
      id: "new-leads",
      label: "New leads awaiting response",
      count: args.newLeads,
      href: leadsHref({ status: "new", range: "7d" }),
      note: "Created in the last 7 days, still marked new",
    },
    {
      id: "not-contacted",
      label: "Leads not contacted",
      count: args.notContacted,
      href: leadsHref({ status: "new" }),
      note: "All leads still in new status",
    },
    {
      id: "invites-pending",
      label: "Invitations pending",
      count: args.pendingInvites,
      href: "/admin/clients",
      note: "Invite sent, not yet accepted",
    },
    {
      id: "invites-stale",
      label: "Invitations older than 7 days",
      count: args.staleInvites,
      href: "/admin/clients",
      note: "Still pending — consider resending",
    },
    {
      id: "awaiting-activation",
      label: "Members awaiting activation",
      count: args.awaitingActivation,
      href: "/admin/clients",
      note: "Account invited but not activated",
    },
  ];
  return items.filter((item) => item.count > 0);
}

function emptyFunnel() {
  return {
    leadsCreated: 0,
    invitationsSent: 0,
    invitationsAccepted: 0,
    membersActivated: 0,
    avgDaysLeadToInvite: null as number | null,
    avgDaysLeadToConversion: null as number | null,
    stages: [
      { label: "Lead created", value: 0 },
      { label: "Invitation sent", value: 0 },
      { label: "Invitation accepted", value: 0 },
      { label: "Member activated", value: 0 },
    ],
  };
}

export async function getMarketingDashboard(
  searchParams: GrowthSearchParams = {},
): Promise<MarketingDashboard> {
  const filters = resolveGrowthFilters(searchParams);
  const label = rangeLabel(filters);

  if (!isSupabasePublicConfigured() || !isSupabaseConfigured()) {
    return {
      ...DEMO_MARKETING_DASHBOARD,
      isDemo: true,
      rangeLabel: label,
    };
  }

  try {
    const supabase = await createClient();
    const today = startOfTodayIso();
    const month = startOfMonthIso();
    const week = startOfWeekIso();
    const sevenDaysAgo = daysAgoIso(7);

    const [
      visitorsTodayRes,
      visitorsMonthRes,
      pageViewsRes,
      visitorsInRangeRes,
      leadsAllRes,
      leadsInRangeRes,
      membersRes,
      inviteProfilesRes,
    ] = await Promise.all([
      supabase
        .from(MA5_TABLES.visitorSessions)
        .select("visitor_id", { count: "exact", head: true })
        .eq("is_bot", false)
        .gte("last_seen", today),
      supabase
        .from(MA5_TABLES.visitorSessions)
        .select("visitor_id", { count: "exact", head: true })
        .eq("is_bot", false)
        .gte("first_seen", month),
      supabase
        .from(MA5_TABLES.visitorSessions)
        .select("page_views")
        .eq("is_bot", false)
        .gte("first_seen", month)
        .limit(5000),
      supabase
        .from(MA5_TABLES.visitorSessions)
        .select(
          "utm_source, utm_medium, utm_campaign, first_seen, page_views",
        )
        .eq("is_bot", false)
        .gte("first_seen", filters.from)
        .lte("first_seen", filters.to)
        .limit(5000),
      supabase
        .from(MA5_TABLES.leads)
        .select(
          "id, visitor_id, name, email, phone, message, utm_source, utm_medium, utm_campaign, utm_term, utm_content, landing_page, referrer, status, converted_profile_id, converted_at, invited_at, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(2000),
      supabase
        .from(MA5_TABLES.leads)
        .select(
          "status, utm_source, utm_medium, utm_campaign, created_at, converted_at, invited_at, converted_profile_id",
        )
        .gte("created_at", filters.from)
        .lte("created_at", filters.to)
        .limit(2000),
      supabase
        .from(MA5_TABLES.profiles)
        .select(
          "id, invited_at, invitation_accepted_at, invitation_status, created_at, active, lead_id, acquisition_source, acquisition_medium, acquisition_campaign",
        )
        .limit(3000),
      supabase
        .from(MA5_TABLES.profiles)
        .select("id, invited_at, invitation_status, active")
        .in("invitation_status", ["sent", "pending"])
        .limit(2000),
    ]);

    if (
      visitorsTodayRes.error ||
      visitorsMonthRes.error ||
      leadsAllRes.error ||
      visitorsInRangeRes.error
    ) {
      console.error("[marketing/dashboard]", {
        visitorsTodayRes: visitorsTodayRes.error,
        visitorsMonthRes: visitorsMonthRes.error,
        leadsAllRes: leadsAllRes.error,
        visitorsInRangeRes: visitorsInRangeRes.error,
      });
      return {
        ...DEMO_MARKETING_DASHBOARD,
        isDemo: true,
        rangeLabel: label,
      };
    }

    const allLeads = ((leadsAllRes.data ?? []) as LeadRow[]).map(mapLead);

    const matchLeadFilters = (lead: MarketingLead) => {
      if (filters.source && lead.utmSource !== filters.source) return false;
      if (filters.campaign && lead.utmCampaign !== filters.campaign) return false;
      return true;
    };

    const leadsInRange = ((leadsInRangeRes.data ?? []) as LeadRow[])
      .map(mapLead)
      .filter(matchLeadFilters);

    const visitorsInRange = (visitorsInRangeRes.data ?? []).filter((row) => {
      if (filters.source && (row.utm_source?.trim() || "(direct)") !== filters.source) {
        return false;
      }
      if (
        filters.campaign &&
        (row.utm_campaign?.trim() || "(none)") !== filters.campaign
      ) {
        return false;
      }
      return true;
    });

    const pageViewsThisMonth = (pageViewsRes.data ?? []).reduce(
      (sum, row) => sum + (row.page_views ?? 0),
      0,
    );

    const newLeadsThisWeek = allLeads.filter(
      (l) => l.createdAt >= week && l.status === "new",
    ).length;
    const leadsAwaitingFollowUp = allLeads.filter(
      (l) => l.status === "new",
    ).length;

    const inviteProfiles = inviteProfilesRes.data ?? [];
    const pendingInvitations = inviteProfiles.length;
    const invitationsNotAccepted = inviteProfiles.filter((p) => {
      if (!p.invited_at) return true;
      return p.invited_at < sevenDaysAgo;
    }).length;
    const awaitingActivation = inviteProfiles.filter(
      (p) => p.active === false,
    ).length;
    const staleInvites = inviteProfiles.filter(
      (p) => p.invited_at && p.invited_at < sevenDaysAgo,
    ).length;

    const profiles = membersRes.data ?? [];
    const membersAcquired = profiles.filter((p) => {
      if (!p.acquisition_source && !p.lead_id) return false;
      if (p.invitation_accepted_at) {
        return (
          p.invitation_accepted_at >= filters.from &&
          p.invitation_accepted_at <= filters.to
        );
      }
      if (p.created_at) {
        return p.created_at >= filters.from && p.created_at <= filters.to;
      }
      return Boolean(p.acquisition_source);
    }).length;

    const leadsCount = leadsInRange.length;
    const conversionRate =
      leadsCount > 0
        ? Math.round((membersAcquired / leadsCount) * 1000) / 10
        : 0;

    const sourceCounts = new Map<string, number>();
    const dayCounts = new Map<string, number>();
    const campaignCounts = new Map<string, number>();

    for (const row of visitorsInRange) {
      const source = row.utm_source?.trim() || "(direct)";
      sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
      const campaign = row.utm_campaign?.trim() || "(none)";
      campaignCounts.set(campaign, (campaignCounts.get(campaign) ?? 0) + 1);
      if (row.first_seen) {
        const dayKey = row.first_seen.slice(0, 10);
        dayCounts.set(dayKey, (dayCounts.get(dayKey) ?? 0) + 1);
      }
    }

    let topCampaign: string | null = null;
    let topCount = 0;
    for (const [campaign, count] of campaignCounts) {
      if (campaign === "(none)") continue;
      if (count > topCount) {
        topCount = count;
        topCampaign = campaign;
      }
    }

    const statusCounts: Record<string, number> = {
      new: 0,
      contacted: 0,
      qualified: 0,
      converted: 0,
      closed: 0,
    };
    for (const row of leadsInRange) {
      if (row.status in statusCounts) statusCounts[row.status] += 1;
    }

    const funnel = buildFunnelReport(
      leadsInRange.map((l) => ({
        created_at: l.createdAt,
        invited_at: l.invitedAt,
        converted_at: l.convertedAt,
        status: l.status,
        converted_profile_id: l.convertedProfileId,
      })),
      profiles
        .filter((p) => p.lead_id)
        .map((p) => ({
          id: p.id,
          invited_at: p.invited_at ?? null,
          invitation_accepted_at: p.invitation_accepted_at ?? null,
          created_at: p.created_at,
          active: Boolean(p.active),
          lead_id: p.lead_id ?? null,
        })),
    );

    const campaigns = await getCampaignPerformance(filters);

    // Build continuous day labels for the selected range (cap at 31 points)
    const visitorsOverTime: { label: string; value: number }[] = [];
    const cursor = new Date(filters.from);
    const end = new Date(filters.to);
    let guard = 0;
    while (cursor <= end && guard < 62) {
      const key = cursor.toISOString().slice(0, 10);
      const short = cursor.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      visitorsOverTime.push({
        label: short,
        value: dayCounts.get(key) ?? 0,
      });
      cursor.setDate(cursor.getDate() + 1);
      guard += 1;
    }
    const trendPoints =
      visitorsOverTime.length > 31
        ? visitorsOverTime.filter((_, i) => i % 2 === 0)
        : visitorsOverTime;

    const filterSources = [
      ...new Set(
        allLeads
          .map((l) => l.utmSource)
          .filter((s): s is string => Boolean(s)),
      ),
    ].sort();
    const filterCampaigns = [
      ...new Set(
        allLeads
          .map((l) => l.utmCampaign)
          .filter((s): s is string => Boolean(s)),
      ),
    ].sort();

    const recentLeads = allLeads.filter(matchLeadFilters).slice(0, 8);

    return {
      isDemo: false,
      rangeLabel: label,
      visitorsToday: visitorsTodayRes.count ?? 0,
      visitorsThisMonth: visitorsMonthRes.count ?? 0,
      pageViewsThisMonth,
      leads: leadsCount,
      newLeadsThisWeek,
      leadsAwaitingFollowUp,
      pendingInvitations,
      invitationsNotAccepted,
      conversionRate,
      membersAcquired,
      topCampaign,
      actionNeeded: buildActionNeeded({
        newLeads: newLeadsThisWeek,
        notContacted: leadsAwaitingFollowUp,
        pendingInvites: pendingInvitations,
        staleInvites: staleInvites,
        awaitingActivation,
      }),
      recentLeads,
      trafficSources: [...sourceCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([lbl, value]) => ({ label: lbl, value })),
      visitorsOverTime: trendPoints,
      leadFunnel: [
        { label: "Visitors", value: visitorsInRange.length },
        { label: "Leads", value: leadsCount },
        {
          label: "Contacted",
          value:
            statusCounts.contacted +
            statusCounts.qualified +
            statusCounts.converted,
        },
        { label: "Members", value: membersAcquired },
      ],
      funnel: funnel.leadsCreated > 0 ? funnel : emptyFunnel(),
      campaignPerformance: campaigns,
      filterSources,
      filterCampaigns,
    };
  } catch (err) {
    console.error("[marketing/dashboard]", err);
    return {
      ...DEMO_MARKETING_DASHBOARD,
      isDemo: true,
      rangeLabel: label,
    };
  }
}

export async function getCampaignPerformance(
  filters?: GrowthFilters,
): Promise<CampaignRow[]> {
  const resolved = filters ?? resolveGrowthFilters({ range: "30d" });

  if (!isSupabasePublicConfigured() || !isSupabaseConfigured()) {
    return DEMO_CAMPAIGNS;
  }

  try {
    const supabase = await createClient();
    const [{ data: visitors }, { data: leads }, { data: members }] =
      await Promise.all([
        supabase
          .from(MA5_TABLES.visitorSessions)
          .select("utm_source, utm_medium, utm_campaign, first_seen")
          .eq("is_bot", false)
          .gte("first_seen", resolved.from)
          .lte("first_seen", resolved.to)
          .limit(5000),
        supabase
          .from(MA5_TABLES.leads)
          .select(
            "utm_source, utm_medium, utm_campaign, status, created_at",
          )
          .gte("created_at", resolved.from)
          .lte("created_at", resolved.to)
          .limit(5000),
        supabase
          .from(MA5_TABLES.profiles)
          .select(
            "acquisition_source, acquisition_medium, acquisition_campaign, invitation_accepted_at, created_at",
          )
          .not("acquisition_campaign", "is", null)
          .limit(5000),
      ]);

    if (!visitors && !leads) return [];

    type Agg = {
      campaign: string;
      source: string | null;
      medium: string | null;
      visitors: number;
      leads: number;
      members: number;
    };

    const map = new Map<string, Agg>();

    function key(
      source: string | null,
      medium: string | null,
      campaign: string | null,
    ) {
      return `${source ?? "(direct)"}|${medium ?? "(none)"}|${campaign ?? "(none)"}`;
    }

    function ensure(
      source: string | null,
      medium: string | null,
      campaign: string | null,
    ): Agg {
      const k = key(source, medium, campaign);
      let row = map.get(k);
      if (!row) {
        row = {
          campaign: campaign?.trim() || "(none)",
          source: source?.trim() || "(direct)",
          medium: medium?.trim() || "(none)",
          visitors: 0,
          leads: 0,
          members: 0,
        };
        map.set(k, row);
      }
      return row;
    }

    for (const v of visitors ?? []) {
      if (
        resolved.source &&
        (v.utm_source?.trim() || "(direct)") !== resolved.source
      ) {
        continue;
      }
      if (
        resolved.campaign &&
        (v.utm_campaign?.trim() || "(none)") !== resolved.campaign
      ) {
        continue;
      }
      ensure(v.utm_source, v.utm_medium, v.utm_campaign).visitors += 1;
    }
    for (const l of leads ?? []) {
      if (
        resolved.source &&
        (l.utm_source?.trim() || "(direct)") !== resolved.source
      ) {
        continue;
      }
      if (
        resolved.campaign &&
        (l.utm_campaign?.trim() || "(none)") !== resolved.campaign
      ) {
        continue;
      }
      ensure(l.utm_source, l.utm_medium, l.utm_campaign).leads += 1;
    }
    for (const m of members ?? []) {
      const when = m.invitation_accepted_at ?? m.created_at;
      if (when && (when < resolved.from || when > resolved.to)) continue;
      if (
        resolved.source &&
        (m.acquisition_source?.trim() || "(direct)") !== resolved.source
      ) {
        continue;
      }
      if (
        resolved.campaign &&
        (m.acquisition_campaign?.trim() || "(none)") !== resolved.campaign
      ) {
        continue;
      }
      ensure(
        m.acquisition_source,
        m.acquisition_medium,
        m.acquisition_campaign,
      ).members += 1;
    }

    return [...map.values()]
      .map((row) => ({
        ...row,
        conversionRate:
          row.leads > 0
            ? Math.round((row.members / row.leads) * 1000) / 10
            : 0,
      }))
      .sort((a, b) => b.leads - a.leads || b.visitors - a.visitors)
      .slice(0, 50);
  } catch (err) {
    console.error("[marketing/campaigns]", err);
    return DEMO_CAMPAIGNS;
  }
}

export async function getMemberAttribution(
  userId: string,
): Promise<MemberAttribution | null> {
  if (!isSupabasePublicConfigured() || !isSupabaseConfigured()) {
    return userId === "demo-client" ? DEMO_MEMBER_ATTRIBUTION : null;
  }

  try {
    const supabase = await createClient();
    const { data: profile, error } = await supabase
      .from(MA5_TABLES.profiles)
      .select(
        "acquisition_source, acquisition_medium, acquisition_campaign, acquisition_landing_page, acquisition_referrer, acquisition_first_seen_at, lead_id",
      )
      .eq("id", userId)
      .maybeSingle();

    if (error || !profile) return null;

    let leadDate: string | null = profile.acquisition_first_seen_at ?? null;
    if (profile.lead_id) {
      const { data: lead } = await supabase
        .from(MA5_TABLES.leads)
        .select("created_at")
        .eq("id", profile.lead_id)
        .maybeSingle();
      if (lead?.created_at) leadDate = lead.created_at;
    }

    if (
      !profile.acquisition_source &&
      !profile.acquisition_medium &&
      !profile.acquisition_campaign &&
      !profile.acquisition_landing_page
    ) {
      return null;
    }

    return {
      originalSource: profile.acquisition_source,
      originalMedium: profile.acquisition_medium,
      originalCampaign: profile.acquisition_campaign,
      landingPage: profile.acquisition_landing_page,
      leadDate,
      referrer: profile.acquisition_referrer,
    };
  } catch (err) {
    console.error("[marketing/memberAttribution]", err);
    return null;
  }
}
