import type { AttributionTouch } from "@/lib/attribution/types";

/**
 * Merge incoming touch into stored first-touch without overwriting populated fields.
 * Mirrors DB trigger semantics for unit tests and server-side guards.
 */
export function mergeFirstTouch(
  existing: AttributionTouch | null,
  incoming: AttributionTouch,
): AttributionTouch {
  if (!existing) return incoming;

  return {
    utmSource: existing.utmSource ?? incoming.utmSource,
    utmMedium: existing.utmMedium ?? incoming.utmMedium,
    utmCampaign: existing.utmCampaign ?? incoming.utmCampaign,
    utmTerm: existing.utmTerm ?? incoming.utmTerm,
    utmContent: existing.utmContent ?? incoming.utmContent,
    landingPage: existing.landingPage ?? incoming.landingPage,
    referrer: existing.referrer ?? incoming.referrer,
    capturedAt: existing.capturedAt || incoming.capturedAt,
  };
}

export function applyLastTouchUpdate(
  existingLast: AttributionTouch | null,
  incoming: AttributionTouch,
  hasCampaignParams: boolean,
): AttributionTouch | null {
  if (hasCampaignParams) return incoming;
  return existingLast ?? incoming;
}

/** Anonymous sessions eligible for 90-day retention purge. */
export function isAnonymousSessionExpired(args: {
  lastSeen: string;
  linkedToLead: boolean;
  retentionDays?: number;
  now?: Date;
}): boolean {
  if (args.linkedToLead) return false;
  const days = args.retentionDays ?? 90;
  const last = new Date(args.lastSeen).getTime();
  const now = (args.now ?? new Date()).getTime();
  return now - last >= days * 24 * 60 * 60 * 1000;
}

/** Safe to delete an unconverted lead (privacy request). */
export function canDeleteLead(args: {
  status: string;
  convertedProfileId: string | null;
  memberActive?: boolean | null;
}): boolean {
  if (args.status === "converted") return false;
  if (args.convertedProfileId && args.memberActive) return false;
  return true;
}

/** Safe to delete a visitor session (no lead link). */
export function canDeleteVisitorSession(linkedToLead: boolean): boolean {
  return !linkedToLead;
}
