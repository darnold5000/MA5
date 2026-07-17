import type { HealthMetric, HealthStatus } from "@/features/analytics/types";
import { cn } from "@/lib/utils";

const STATUS_DOT: Record<HealthStatus, string> = {
  good: "bg-emerald-500",
  watch: "bg-amber-400",
  alert: "bg-brand",
};

const STATUS_LABEL: Record<HealthStatus, string> = {
  good: "Healthy",
  watch: "Watch",
  alert: "Needs attention",
};

export function HealthSnapshot({ metrics }: { metrics: HealthMetric[] }) {
  return (
    <section className="border border-border bg-surface p-5 sm:p-6">
      <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
        Business health
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.id} className="flex gap-3">
            <span
              className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", STATUS_DOT[m.status])}
              title={STATUS_LABEL[m.status]}
              aria-label={STATUS_LABEL[m.status]}
            />
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">
                {m.label}
              </p>
              <p className="mt-1 font-display text-3xl tracking-wide">{m.value}</p>
              <p className="mt-1 text-xs text-muted">{m.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
