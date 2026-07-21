import type { MetricTone } from "@/features/analytics/types";
import { cn } from "@/lib/utils";

export function metricToneClass(tone: MetricTone = "default"): string {
  return cn(
    tone === "positive" && "text-emerald-700",
    tone === "negative" && "text-brand",
    tone === "warning" && "text-amber-700",
    tone === "muted" && "text-muted",
    tone === "default" && "text-foreground",
  );
}

/** Separate session keys so Daily Ops and Reports each animate once per visit. */
export const COUNTUP_SESSION_KEYS = {
  dailyOps: "ma5_ops_countup_played",
  reports: "ma5_reports_countup_played",
} as const;
