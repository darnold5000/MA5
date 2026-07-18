export {
  getCampaignPerformance,
  getMarketingDashboard,
  getMemberAttribution,
  listMarketingLeads,
  type LeadFilters,
} from "@/features/marketing/queries";
export {
  growthFiltersToQuery,
  leadsHref,
  rangeLabel,
  resolveGrowthFilters,
  type DateRangePreset,
  type GrowthFilters,
  type GrowthSearchParams,
} from "@/features/marketing/filters";
export { applyAttributionToMember } from "@/features/marketing/convert";
export { attachLeadOnInvite, resolveLeadIdForEmail } from "@/features/marketing/link-lead";
export { buildFunnelReport } from "@/features/marketing/funnel";
export {
  computeGrowthScore,
  computeLeadAging,
  computeTopSource,
} from "@/features/marketing/growth-score";
export type {
  ActionNeededItem,
  CampaignRow,
  FunnelMetrics,
  GrowthScore,
  LeadAgingBuckets,
  LeadStatus,
  MarketingDashboard,
  MarketingLead,
  MemberAttribution,
  MetricTrend,
  TopSource,
} from "@/features/marketing/types";
