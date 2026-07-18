export type GrowthScoreStatus = "healthy" | "watch" | "needs_attention";

export type GrowthScore = {
  score: number;
  status: GrowthScoreStatus;
  statusLabel: string;
  /** Percent change vs prior month score, null if no baseline */
  deltaPercent: number | null;
  deltaLabel: string;
};

export type MetricTrend = {
  percent: number;
  label: string;
  direction: "up" | "down" | "flat";
};

export type LeadAgingBuckets = {
  fresh: number;
  warming: number;
  stale: number;
};

export type TopSource = {
  name: string;
  leadCount: number;
  percentOfLeads: number;
};

export function percentChange(
  current: number,
  previous: number,
): number | null {
  if (previous === 0) {
    if (current === 0) return 0;
    return null;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function toMetricTrend(
  current: number,
  previous: number,
  label: string,
): MetricTrend | null {
  const pct = percentChange(current, previous);
  if (pct == null) {
    if (current > 0 && previous === 0) {
      return { percent: 100, label, direction: "up" };
    }
    return null;
  }
  const direction: MetricTrend["direction"] =
    pct > 0.5 ? "up" : pct < -0.5 ? "down" : "flat";
  return { percent: Math.abs(pct), label, direction };
}

/**
 * Weighted 0–100 health score from MA5-owned metrics only.
 * Not AI — simple scoring an owner can understand at a glance.
 */
export function computeGrowthScore(input: {
  leadsThisMonth: number;
  leadsLastMonth: number;
  conversionRate: number;
  pendingFollowUps: number;
  invitationsAccepted: number;
  invitationsSent: number;
  visitorsThisMonth: number;
  visitorsLastMonth: number;
  /** Optional prior-month score for delta; if omitted, delta uses visitor+lead blend */
  priorScore?: number | null;
}): GrowthScore {
  // Leads volume (25): ~12+ leads/month fills the bucket; small bonus if growing
  let leadsPts = Math.min(22, input.leadsThisMonth * 1.8);
  if (input.leadsThisMonth > input.leadsLastMonth && input.leadsThisMonth > 0) {
    leadsPts = Math.min(25, leadsPts + 3);
  } else if (input.leadsThisMonth === 0) {
    leadsPts = 0;
  }

  // Conversion (25): 20% lead→member ≈ full marks
  const convPts = Math.min(25, (Math.max(0, input.conversionRate) / 20) * 25);

  // Follow-up hygiene (20): pending new leads drag the score down
  const followPts = Math.max(0, 20 - input.pendingFollowUps * 4);

  // Invitation acceptance (15)
  const acceptRate =
    input.invitationsSent > 0
      ? input.invitationsAccepted / input.invitationsSent
      : input.invitationsAccepted > 0
        ? 1
        : 0.55;
  const invitePts = Math.min(15, acceptRate * 15);

  // Visitor trend (15)
  let visitorPts = 7;
  if (input.visitorsLastMonth > 0) {
    const change =
      (input.visitorsThisMonth - input.visitorsLastMonth) /
      input.visitorsLastMonth;
    visitorPts = Math.min(15, Math.max(0, 8 + change * 25));
  } else if (input.visitorsThisMonth > 0) {
    visitorPts = 11;
  } else {
    visitorPts = 3;
  }

  const score = Math.round(
    Math.min(100, Math.max(0, leadsPts + convPts + followPts + invitePts + visitorPts)),
  );

  let status: GrowthScoreStatus = "needs_attention";
  let statusLabel = "Needs attention";
  if (score >= 80) {
    status = "healthy";
    statusLabel = "Healthy";
  } else if (score >= 55) {
    status = "watch";
    statusLabel = "Watch";
  }

  let deltaPercent: number | null = null;
  if (input.priorScore != null && input.priorScore > 0) {
    deltaPercent = percentChange(score, input.priorScore);
  } else {
    // Approximate month-over-month from lead + visitor blend when no prior score
    const blendNow = input.leadsThisMonth * 3 + input.visitorsThisMonth;
    const blendPrev = input.leadsLastMonth * 3 + input.visitorsLastMonth;
    deltaPercent = percentChange(blendNow, blendPrev);
  }

  let deltaLabel = "vs last month";
  if (deltaPercent == null) {
    deltaLabel = "No prior month baseline yet";
  } else if (deltaPercent > 0) {
    deltaLabel = `↑ +${deltaPercent}% from last month`;
  } else if (deltaPercent < 0) {
    deltaLabel = `↓ ${deltaPercent}% from last month`;
  } else {
    deltaLabel = "→ Flat vs last month";
  }

  return { score, status, statusLabel, deltaPercent, deltaLabel };
}

export function computeLeadAging(
  openLeads: { createdAt: string }[],
  now = Date.now(),
): LeadAgingBuckets {
  const buckets: LeadAgingBuckets = { fresh: 0, warming: 0, stale: 0 };
  const dayMs = 1000 * 60 * 60 * 24;

  for (const lead of openLeads) {
    const age = (now - new Date(lead.createdAt).getTime()) / dayMs;
    if (age < 0 || Number.isNaN(age)) {
      buckets.fresh += 1;
    } else if (age <= 2) {
      buckets.fresh += 1;
    } else if (age <= 7) {
      buckets.warming += 1;
    } else {
      buckets.stale += 1;
    }
  }
  return buckets;
}

export function computeTopSource(
  leads: { utmSource: string | null }[],
): TopSource | null {
  if (leads.length === 0) return null;
  const counts = new Map<string, number>();
  for (const lead of leads) {
    const key = lead.utmSource?.trim() || "(direct)";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [name, count] of counts) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }
  if (!best) return null;
  return {
    name: best,
    leadCount: bestCount,
    percentOfLeads: Math.round((bestCount / leads.length) * 1000) / 10,
  };
}

export function oldestOpenLeadDays(
  openLeads: { createdAt: string }[],
  now = Date.now(),
): number | null {
  if (openLeads.length === 0) return null;
  let oldest = 0;
  const dayMs = 1000 * 60 * 60 * 24;
  for (const lead of openLeads) {
    const age = Math.floor((now - new Date(lead.createdAt).getTime()) / dayMs);
    if (age > oldest) oldest = age;
  }
  return oldest;
}
