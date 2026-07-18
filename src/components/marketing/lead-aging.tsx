import Link from "next/link";

import type { LeadAgingBuckets } from "@/features/marketing/types";
import { leadsHref } from "@/features/marketing/filters";

export function LeadAgingWidget({ aging }: { aging: LeadAgingBuckets }) {
  const total = aging.fresh + aging.warming + aging.stale;

  if (total === 0) {
    return (
      <section className="border border-border bg-surface p-5">
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Lead aging
        </p>
        <h2 className="mt-1 font-display text-xl tracking-wide uppercase">
          No open leads
        </h2>
        <p className="mt-2 text-sm text-muted">
          Aging buckets fill when contact-form leads are waiting for follow-up.
        </p>
      </section>
    );
  }

  const rows = [
    {
      label: "0–2 days",
      count: aging.fresh,
      warn: false,
      href: leadsHref({ status: "new", range: "7d" }),
    },
    {
      label: "3–7 days",
      count: aging.warming,
      warn: false,
      href: leadsHref({ status: "new" }),
    },
    {
      label: "7+ days",
      count: aging.stale,
      warn: true,
      href: leadsHref({ status: "new" }),
    },
  ];

  return (
    <section className="border border-border bg-surface p-5">
      <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
        Lead aging
      </p>
      <h2 className="mt-1 font-display text-xl tracking-wide uppercase">
        Open pipeline
      </h2>
      <p className="mt-1 text-sm text-muted">
        How long open leads have been waiting — so no one falls through.
      </p>
      <ul className="mt-4 space-y-2">
        {rows.map((row) => (
          <li key={row.label}>
            <Link
              href={row.href}
              className="flex items-center justify-between border border-border px-3 py-2.5 text-sm transition hover:border-brand"
            >
              <span className="text-muted">{row.label}</span>
              <span className="flex items-center gap-2 font-display text-xl tracking-wide tabular-nums">
                {row.count}
                {row.warn && row.count > 0 ? (
                  <span className="text-[10px] font-semibold tracking-wide text-brand uppercase">
                    Act
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
