export {
  getCampaignPerformance,
  getMarketingDashboard,
  getMemberAttribution,
  listMarketingLeads,
  type LeadFilters,
} from "@/features/marketing/queries";
export { applyAttributionToMember } from "@/features/marketing/convert";
export { attachLeadOnInvite, resolveLeadIdForEmail } from "@/features/marketing/link-lead";
export { buildFunnelReport } from "@/features/marketing/funnel";
export type {
  CampaignRow,
  FunnelMetrics,
  LeadStatus,
  MarketingDashboard,
  MarketingLead,
  MemberAttribution,
} from "@/features/marketing/types";
