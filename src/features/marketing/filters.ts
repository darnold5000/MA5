export type DateRangePreset = "7d" | "30d" | "month" | "custom";

export type GrowthFilters = {
  preset: DateRangePreset;
  /** Inclusive range start (ISO) */
  from: string;
  /** Inclusive range end (ISO) */
  to: string;
  source?: string;
  campaign?: string;
  status?: string;
};

export type GrowthSearchParams = {
  range?: string;
  from?: string;
  to?: string;
  source?: string;
  campaign?: string;
  status?: string;
};

function startOfDay(d: Date): Date {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(d: Date): Date {
  const next = new Date(d);
  next.setHours(23, 59, 59, 999);
  return next;
}

function startOfMonth(d = new Date()): Date {
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function resolveGrowthFilters(
  params: GrowthSearchParams = {},
): GrowthFilters {
  const source = params.source?.trim() || undefined;
  const campaign = params.campaign?.trim() || undefined;
  const status = params.status?.trim() || undefined;

  const raw = params.range?.trim() || "30d";
  const preset: DateRangePreset =
    raw === "7d" || raw === "30d" || raw === "month" || raw === "custom"
      ? raw
      : "30d";

  const now = new Date();

  if (preset === "custom" && params.from && params.to) {
    const fromDate = startOfDay(new Date(params.from));
    const toDate = endOfDay(new Date(params.to));
    if (!Number.isNaN(fromDate.getTime()) && !Number.isNaN(toDate.getTime())) {
      return {
        preset,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        source,
        campaign,
        status,
      };
    }
  }

  if (preset === "7d") {
    const from = startOfDay(new Date(now));
    from.setDate(from.getDate() - 6);
    return {
      preset: "7d",
      from: from.toISOString(),
      to: endOfDay(now).toISOString(),
      source,
      campaign,
      status,
    };
  }

  if (preset === "month") {
    return {
      preset: "month",
      from: startOfMonth(now).toISOString(),
      to: endOfDay(now).toISOString(),
      source,
      campaign,
      status,
    };
  }

  // Default: last 30 days
  const from = startOfDay(new Date(now));
  from.setDate(from.getDate() - 29);
  return {
    preset: "30d",
    from: from.toISOString(),
    to: endOfDay(now).toISOString(),
    source,
    campaign,
    status,
  };
}

export function growthFiltersToQuery(filters: GrowthFilters): string {
  const params = new URLSearchParams();
  params.set("range", filters.preset);
  if (filters.preset === "custom") {
    params.set("from", filters.from.slice(0, 10));
    params.set("to", filters.to.slice(0, 10));
  }
  if (filters.source) params.set("source", filters.source);
  if (filters.campaign) params.set("campaign", filters.campaign);
  if (filters.status) params.set("status", filters.status);
  const q = params.toString();
  return q ? `?${q}` : "";
}

export function leadsHref(opts: {
  status?: string;
  source?: string;
  campaign?: string;
  range?: DateRangePreset;
}): string {
  const params = new URLSearchParams();
  if (opts.status) params.set("status", opts.status);
  if (opts.source) params.set("source", opts.source);
  if (opts.campaign) params.set("campaign", opts.campaign);
  if (opts.range) params.set("range", opts.range);
  const q = params.toString();
  return q ? `/admin/marketing/leads?${q}` : "/admin/marketing/leads";
}

export function rangeLabel(filters: GrowthFilters): string {
  if (filters.preset === "7d") return "Last 7 days";
  if (filters.preset === "30d") return "Last 30 days";
  if (filters.preset === "month") return "This month";
  try {
    const from = new Date(filters.from).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    const to = new Date(filters.to).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    return `${from} – ${to}`;
  } catch {
    return "Custom range";
  }
}
