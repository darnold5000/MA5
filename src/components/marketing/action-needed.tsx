import Link from "next/link";

import type { ActionNeededItem } from "@/features/marketing/types";

export function ActionNeededSection({ items }: { items: ActionNeededItem[] }) {
  if (items.length === 0) {
    return (
      <section className="space-y-3 border border-border bg-surface p-5">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
            Action needed
          </p>
          <h2 className="mt-1 font-display text-2xl tracking-wide uppercase">
            You&apos;re caught up
          </h2>
        </div>
        <p className="text-sm text-muted">
          No new leads or pending invitations need attention right now. New
          items appear here when someone submits the contact form or an invite
          is waiting to be accepted.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Action needed
        </p>
        <h2 className="mt-1 font-display text-2xl tracking-wide uppercase">
          Follow up
        </h2>
        <p className="mt-1 text-sm text-muted">
          Open items from MA5 leads and invitations — not ad platforms.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="border border-border bg-surface p-5 transition hover:border-brand"
          >
            <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">
              {item.label}
            </p>
            <p className="mt-3 font-display text-4xl tracking-wide text-foreground">
              {item.count}
            </p>
            <p className="mt-2 text-xs text-muted">{item.note}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
