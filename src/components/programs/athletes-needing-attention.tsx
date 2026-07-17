import Link from "next/link";

import type { CoachAttentionAlert } from "@/features/programs/types";

export function AthletesNeedingAttention({
  alerts,
}: {
  alerts: CoachAttentionAlert[];
}) {
  if (alerts.length === 0) return null;

  return (
    <section className="border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
            Training
          </p>
          <h2 className="mt-1 font-display text-2xl tracking-wide uppercase">
            Athletes needing attention
          </h2>
        </div>
        <Link
          href="/admin/clients"
          className="text-xs font-semibold tracking-wide text-brand uppercase hover:underline"
        >
          View all →
        </Link>
      </div>

      <ul className="mt-5 divide-y divide-border">
        {alerts.map((alert) => (
          <li key={alert.id}>
            <Link
              href={alert.href}
              className="flex flex-wrap items-baseline justify-between gap-2 py-3 transition hover:text-brand"
            >
              <span className="font-display text-lg tracking-wide uppercase">
                {alert.clientName.split(" ")[0]}
              </span>
              <span className="text-sm text-muted">{alert.reason}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
