import type { LeadStatus } from "@/lib/attribution/types";
import type {
  GrowthScore,
  LeadAgingBuckets,
  MetricTrend,
  TopSource,
} from "@/features/marketing/growth-score";

export type { LeadStatus };
export type { GrowthScore, LeadAgingBuckets, MetricTrend, TopSource };

export type MarketingLead = {
  id: string;
  visitorId: string | null;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  landingPage: string | null;
  referrer: string | null;
  status: LeadStatus;
  convertedProfileId: string | null;
  convertedAt: string | null;
  invitedAt: string | null;
  createdAt: string;
};

export type CampaignRow = {
  campaign: string;
  source: string | null;
  medium: string | null;
  visitors: number;
  leads: number;
  members: number;
  conversionRate: number;
};

export type FunnelMetrics = {
  leadsCreated: number;
  invitationsSent: number;
  invitationsAccepted: number;
  membersActivated: number;
  avgDaysLeadToInvite: number | null;
  avgDaysLeadToConversion: number | null;
  stages: { label: string; value: number }[];
};

export type ActionNeededItem = {
  id: string;
  label: string;
  count: number;
  href: string;
  note: string;
  /** Short CTA shown on the card, e.g. View / Resend / Contact */
  actionLabel: string;
};

export type MarketingDashboard = {
  /** True when showing local demo fallback (Supabase not configured). */
  isDemo: boolean;
  rangeLabel: string;

  growthScore: GrowthScore;
  leadAging: LeadAgingBuckets;
  topSource: TopSource | null;

  trends: {
    leads: MetricTrend | null;
    conversionRate: MetricTrend | null;
    membersAcquired: MetricTrend | null;
    visitorsThisMonth: MetricTrend | null;
    newLeadsThisWeek: MetricTrend | null;
  };

  /** Unique human visitors active today (calendar day; bots excluded) */
  visitorsToday: number;
  /** Unique human visitors first seen this calendar month */
  visitorsThisMonth: number;
  /** Sum of page_views for human visitors this calendar month */
  pageViewsThisMonth: number;

  /** Leads created in the selected date range (source/campaign filtered) */
  leads: number;
  newLeadsThisWeek: number;
  leadsAwaitingFollowUp: number;
  pendingInvitations: number;
  invitationsNotAccepted: number;

  conversionRate: number;
  membersAcquired: number;
  topCampaign: string | null;

  actionNeeded: ActionNeededItem[];
  recentLeads: MarketingLead[];

  trafficSources: { label: string; value: number }[];
  visitorsOverTime: { label: string; value: number }[];
  leadFunnel: { label: string; value: number }[];
  funnel: FunnelMetrics;
  campaignPerformance: CampaignRow[];

  /** Filter option lists derived from collected data */
  filterSources: string[];
  filterCampaigns: string[];
};

export type MemberAttribution = {
  originalSource: string | null;
  originalMedium: string | null;
  originalCampaign: string | null;
  landingPage: string | null;
  leadDate: string | null;
  referrer: string | null;
};
