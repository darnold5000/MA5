import type { GrowthScore } from "@/features/marketing/types";

const STATUS_STYLES: Record<
  GrowthScore["status"],
  { dot: string; label: string }
> = {
  healthy: { dot: "bg-emerald-500", label: "Healthy" },
  watch: { dot: "bg-amber-500", label: "Watch" },
  needs_attention: { dot: "bg-brand", label: "Needs attention" },
};

export function GrowthScoreCard({ score }: { score: GrowthScore }) {
  const style = STATUS_STYLES[score.status];

  return (
    <section className="border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
            Growth score
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span
              className={`inline-block h-3 w-3 rounded-full ${style.dot}`}
              aria-hidden
            />
            <p className="font-display text-2xl tracking-wide uppercase sm:text-3xl">
              {score.statusLabel}
            </p>
          </div>
          <p className="mt-2 text-sm text-muted">{score.deltaLabel}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-5xl tracking-wide text-foreground tabular-nums sm:text-6xl">
            {score.score}
            <span className="text-2xl text-muted">/100</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            Weighted from leads, conversion, follow-ups, invites &amp; visitors
          </p>
        </div>
      </div>
    </section>
  );
}
