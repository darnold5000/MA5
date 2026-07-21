"use client";

import { cn } from "@/lib/utils";

export type AnalyticsViewMode = "numbers" | "chart";

export function ViewToggle({
  value,
  onChange,
}: {
  value: AnalyticsViewMode;
  onChange: (value: AnalyticsViewMode) => void;
}) {
  return (
    <div
      className="inline-flex border border-border text-xs font-semibold tracking-wide uppercase"
      role="group"
      aria-label="View mode"
    >
      <button
        type="button"
        onClick={() => onChange("numbers")}
        aria-pressed={value === "numbers"}
        className={cn(
          "min-h-9 px-3 py-1.5 transition",
          value === "numbers"
            ? "bg-brand text-white"
            : "text-muted hover:text-foreground",
        )}
      >
        Numbers
      </button>
      <button
        type="button"
        onClick={() => onChange("chart")}
        aria-pressed={value === "chart"}
        className={cn(
          "min-h-9 px-3 py-1.5 transition",
          value === "chart"
            ? "bg-brand text-white"
            : "text-muted hover:text-foreground",
        )}
      >
        Chart
      </button>
    </div>
  );
}
