import type { ChartPoint } from "@/features/analytics/types";
import { cn } from "@/lib/utils";

export function SimpleBarChart({
  points,
  formatValue,
  className,
}: {
  points: ChartPoint[];
  formatValue?: (value: number) => string;
  className?: string;
}) {
  const max = Math.max(...points.map((p) => p.value), 1);

  return (
    <div className={cn("border border-border bg-surface p-5 sm:p-6", className)}>
      <div
        className="flex h-44 items-end gap-2 sm:gap-3"
        role="img"
        aria-label="Bar chart"
      >
        {points.map((p) => {
          const height = Math.max(8, Math.round((p.value / max) * 100));
          return (
            <div
              key={p.label}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
            >
              <span className="text-[10px] text-muted tabular-nums">
                {formatValue ? formatValue(p.value) : p.value}
              </span>
              <div
                className="w-full max-w-12 bg-brand/80 transition-[height]"
                style={{ height: `${height}%` }}
                title={`${p.label}: ${formatValue ? formatValue(p.value) : p.value}`}
              />
              <span className="text-[10px] font-semibold tracking-wide text-muted uppercase">
                {p.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
