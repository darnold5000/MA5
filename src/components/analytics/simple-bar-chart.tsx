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
  const barAreaPx = 112;

  return (
    <div className={cn("border border-border bg-surface p-5 sm:p-6", className)}>
      <div
        className="flex gap-2 sm:gap-3"
        role="img"
        aria-label="Bar chart"
      >
        {points.map((p) => {
          const barHeight =
            p.value === 0 ? 0 : Math.max(6, Math.round((p.value / max) * barAreaPx));
          const display = formatValue ? formatValue(p.value) : String(p.value);
          return (
            <div
              key={p.label}
              className="flex min-w-0 flex-1 flex-col items-center gap-2"
            >
              <span className="min-h-4 text-[10px] text-muted tabular-nums">
                {display}
              </span>
              <div
                className="flex h-28 w-full items-end justify-center"
                aria-hidden
              >
                <div
                  className="w-full max-w-12 bg-brand/80 transition-all"
                  style={{ height: `${barHeight}px` }}
                  title={`${p.label}: ${display}`}
                />
              </div>
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
