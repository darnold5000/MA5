import {
  DEMO_CAMPAIGNS,
  DEMO_LEADS,
  DEMO_MARKETING_DASHBOARD,
  DEMO_MEMBER_ATTRIBUTION,
} from "@/features/marketing/demo-data";
import type {
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
        "id, visitor_id, name, email, phone, message, utm_source, utm_medium, utm_campaign, utm_term, utm_content, landing_page, referrer, status, converted_profile_id, converted_at, created_at",
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

export async function getMarketingDashboard(): Promise<MarketingDashboard> {
  if (!isSupabasePublicConfigured() || !isSupabaseConfigured()) {
    return DEMO_MARKETING_DASHBOARD;
  }

  try {
    const supabase = await createClient();
    const today = startOfTodayIso();
    const month = startOfMonthIso();

    const [
      visitorsTodayRes,
      visitorsMonthRes,
      leadsRes,
      membersRes,
      visitorRowsRes,
      leadRowsRes,
    ] = await Promise.all([
      supabase
        .from(MA5_TABLES.visitorSessions)
        .select("visitor_id", { count: "exact", head: true })
        .gte("last_seen", today),
      supabase
        .from(MA5_TABLES.visitorSessions)
        .select("visitor_id", { count: "exact", head: true })
        .gte("first_seen", month),
      supabase
        .from(MA5_TABLES.leads)
        .select("id", { count: "exact", head: true }),
      supabase
        .from(MA5_TABLES.profiles)
        .select("id", { count: "exact", head: true })
        .not("acquisition_source", "is", null),
      supabase
        .from(MA5_TABLES.visitorSessions)
        .select("utm_source, utm_campaign, first_seen")
        .gte("first_seen", month)
        .limit(2000),
      supabase
        .from(MA5_TABLES.leads)
        .select(
          "status, utm_source, utm_medium, utm_campaign, created_at, converted_at",
        )
        .limit(2000),
    ]);

    if (
      visitorsTodayRes.error ||
      visitorsMonthRes.error ||
      leadsRes.error ||
      membersRes.error ||
      visitorRowsRes.error ||
      leadRowsRes.error
    ) {
      return DEMO_MARKETING_DASHBOARD;
    }

    const visitorsThisMonth = visitorsMonthRes.count ?? 0;
    const leads = leadsRes.count ?? 0;
    const membersAcquired = membersRes.count ?? 0;
    const conversionRate =
      leads > 0 ? Math.round((membersAcquired / leads) * 1000) / 10 : 0;

    const sourceCounts = new Map<string, number>();
    const campaignCounts = new Map<string, number>();
    const dayCounts = new Map<string, number>();

    for (const row of visitorRowsRes.data ?? []) {
      const source = row.utm_source?.trim() || "(direct)";
      sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
      const campaign = row.utm_campaign?.trim() || "(none)";
      campaignCounts.set(campaign, (campaignCounts.get(campaign) ?? 0) + 1);
      if (row.first_seen) {
        const day = new Date(row.first_seen).toLocaleDateString("en-US", {
          weekday: "short",
        });
        dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
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
    for (const row of leadRowsRes.data ?? []) {
      const status = row.status as string;
      if (status in statusCounts) statusCounts[status] += 1;
    }

    const campaigns = await getCampaignPerformance();

    return {
      visitorsToday: visitorsTodayRes.count ?? 0,
      visitorsThisMonth,
      leads,
      conversionRate,
      membersAcquired,
      topCampaign,
      trafficSources: [...sourceCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([label, value]) => ({ label, value })),
      visitorsOverTime: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
        (label) => ({ label, value: dayCounts.get(label) ?? 0 }),
      ),
      leadFunnel: [
        { label: "Visitors", value: visitorsThisMonth },
        { label: "Leads", value: leads },
        {
          label: "Contacted",
          value:
            statusCounts.contacted +
            statusCounts.qualified +
            statusCounts.converted,
        },
        { label: "Members", value: membersAcquired },
      ],
      campaignPerformance: campaigns,
    };
  } catch (err) {
    console.error("[marketing/dashboard]", err);
    return DEMO_MARKETING_DASHBOARD;
  }
}

export async function getCampaignPerformance(): Promise<CampaignRow[]> {
  if (!isSupabasePublicConfigured() || !isSupabaseConfigured()) {
    return DEMO_CAMPAIGNS;
  }

  try {
    const supabase = await createClient();
    const [{ data: visitors }, { data: leads }, { data: members }] =
      await Promise.all([
        supabase
          .from(MA5_TABLES.visitorSessions)
          .select("utm_source, utm_medium, utm_campaign")
          .limit(5000),
        supabase
          .from(MA5_TABLES.leads)
          .select("utm_source, utm_medium, utm_campaign, status")
          .limit(5000),
        supabase
          .from(MA5_TABLES.profiles)
          .select(
            "acquisition_source, acquisition_medium, acquisition_campaign",
          )
          .not("acquisition_campaign", "is", null)
          .limit(5000),
      ]);

    if (!visitors && !leads) return DEMO_CAMPAIGNS;

    type Agg = {
      campaign: string;
      source: string | null;
      medium: string | null;
      visitors: number;
      leads: number;
      members: number;
    };

    const map = new Map<string, Agg>();

    function key(source: string | null, medium: string | null, campaign: string | null) {
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
      ensure(v.utm_source, v.utm_medium, v.utm_campaign).visitors += 1;
    }
    for (const l of leads ?? []) {
      ensure(l.utm_source, l.utm_medium, l.utm_campaign).leads += 1;
    }
    for (const m of members ?? []) {
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
