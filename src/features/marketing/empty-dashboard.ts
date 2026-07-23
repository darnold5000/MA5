import type { MarketingDashboard } from "@/features/marketing/types";

/** Zeroed dashboard for live deployments when data is unavailable. */
export function emptyMarketingDashboard(rangeLabel: string): MarketingDashboard {
  return {
    isDemo: false,
    unavailable: true,
    unavailableMessage: null,
    rangeLabel,
    growthScore: {
      score: 0,
      status: "needs_attention",
      statusLabel: "No data",
      deltaPercent: 0,
      deltaLabel: "Metrics unavailable",
    },
    leadAging: { fresh: 0, warming: 0, stale: 0 },
    topSource: null,
    trends: {
      leads: null,
      conversionRate: null,
      membersAcquired: null,
      visitorsThisMonth: null,
      newLeadsThisWeek: null,
    },
    visitorsToday: 0,
    visitorsThisMonth: 0,
    pageViewsThisMonth: 0,
    leads: 0,
    newLeadsThisWeek: 0,
    leadsAwaitingFollowUp: 0,
    pendingInvitations: 0,
    invitationsNotAccepted: 0,
    conversionRate: 0,
    membersAcquired: 0,
    topCampaign: null,
    actionNeeded: [],
    recentLeads: [],
    trafficSources: [],
    visitorsOverTime: [],
    leadFunnel: [],
    funnel: {
      leadsCreated: 0,
      invitationsSent: 0,
      invitationsAccepted: 0,
      membersActivated: 0,
      avgDaysLeadToInvite: null,
      avgDaysLeadToConversion: null,
      stages: [
        { label: "Lead created", value: 0 },
        { label: "Invitation sent", value: 0 },
        { label: "Invitation accepted", value: 0 },
        { label: "Member activated", value: 0 },
      ],
    },
    campaignPerformance: [],
    filterSources: [],
    filterCampaigns: [],
  };
}

export function unavailableMarketingDashboard(
  rangeLabel: string,
  message: string,
): MarketingDashboard {
  return {
    ...emptyMarketingDashboard(rangeLabel),
    unavailable: true,
    unavailableMessage: message,
  };
}
