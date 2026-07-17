import Link from "next/link";

import type { CoachAttentionAlert } from "@/features/programs/types";

/**
 * Coach action queue — yellow = follow-up recommended.
 * Includes problems and positive milestones that still need a coach response.
 */
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
            Coach action items
          </p>
          <h2 className="mt-1 font-display text-2xl tracking-wide uppercase">
            Needs your attention
          </h2>
          <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted">
            <span
              className="size-2.5 shrink-0 rounded-full bg-amber-400"
              aria-hidden
            />
            Follow-up recommended
          </p>
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
              className="flex flex-wrap items-center justify-between gap-3 py-3 transition hover:text-brand"
            >
              <span className="inline-flex items-center gap-2.5">
                <span
                  className="size-2.5 shrink-0 rounded-full bg-amber-400"
                  aria-hidden
                />
                <span className="font-display text-lg tracking-wide uppercase">
                  {alert.clientName.split(" ")[0]}
                </span>
              </span>
              <span className="text-sm text-muted">{alert.reason}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
