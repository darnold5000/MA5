import Link from "next/link";

import { capacityPercent, formatCompactMoney } from "@/features/analytics";
import type {
  ActivityItem,
  CapacityRow,
  MessageRow,
  PaymentRow,
  ProgramPopularity,
  ScheduleRow,
  SignupRow,
} from "@/features/analytics/types";
import { cn } from "@/lib/utils";

export function SectionHeader({
  eyebrow,
  title,
  href,
  linkLabel = "View all",
}: {
  eyebrow: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          {eyebrow}
        </p>
        <h2 className="mt-1 font-display text-2xl tracking-wide uppercase">
          {title}
        </h2>
      </div>
      {href ? (
        <Link
          href={href}
          className="text-xs font-semibold tracking-wide text-brand uppercase hover:underline"
        >
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}

const PAYMENT_STATUS: Record<
  PaymentRow["status"],
  { label: string; className: string }
> = {
  paid: { label: "Paid", className: "hub-text-success" },
  failed: { label: "Failed", className: "text-brand" },
  refunded: { label: "Refunded", className: "text-muted" },
  pending: { label: "Pending", className: "hub-text-warning" },
};

export function TodaySchedule({ rows }: { rows: ScheduleRow[] }) {
  return (
    <section>
      <SectionHeader
        eyebrow="Today"
        title="Schedule"
        href="/admin/schedule"
        linkLabel="Full schedule"
      />
      <div className="mt-5 divide-y divide-border border border-border bg-surface">
        {rows.map((row) => {
          const pct = capacityPercent(row.booked, row.capacity);
          const nearlyFull = pct >= 90;
          return (
            <Link
              key={row.id}
              href={row.href}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-background"
            >
              <div className="min-w-0">
                <p className="font-display text-lg tracking-wide uppercase">
                  {row.time}
                </p>
                <p className="mt-0.5 text-sm text-foreground">{row.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  Coach {row.coach}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={cn(
                    "font-display text-xl tracking-wide",
                    nearlyFull && "text-brand",
                  )}
                >
                  {row.booked} / {row.capacity}
                </p>
                <p className="text-xs text-muted">{pct}% capacity</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function RecentPayments({ rows }: { rows: PaymentRow[] }) {
  return (
    <section>
      <SectionHeader eyebrow="Payments" title="Recent" href="/admin/clients" />
      <div className="mt-5 divide-y divide-border border border-border bg-surface">
        {rows.map((row) => {
          const status = PAYMENT_STATUS[row.status];
          return (
            <article
              key={row.id}
              className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-4"
            >
              <div>
                <p className="font-display text-lg tracking-wide uppercase">
                  {row.clientName}
                </p>
                <p className="mt-0.5 text-sm text-muted">{row.product}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-foreground">
                  {formatCompactMoney(row.amountCents)}
                </p>
                <p className={cn("mt-0.5 text-xs font-semibold", status.className)}>
                  {status.label} · {row.when}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function RecentSignups({ rows }: { rows: SignupRow[] }) {
  return (
    <section>
      <SectionHeader eyebrow="Clients" title="Recent signups" href="/admin/clients" />
      <div className="mt-5 divide-y divide-border border border-border bg-surface">
        {rows.map((row) => (
          <article
            key={row.id}
            className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-4"
          >
            <div>
              <p className="font-display text-lg tracking-wide uppercase">
                {row.clientName}
              </p>
              <p className="mt-0.5 text-sm text-muted">{row.plan}</p>
            </div>
            <p className="text-xs text-muted">{row.when}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function RecentMessages({ rows }: { rows: MessageRow[] }) {
  return (
    <section>
      <SectionHeader eyebrow="Inbox" title="Recent messages" href="/admin/messages" />
      <div className="mt-5 divide-y divide-border border border-border bg-surface">
        {rows.map((row) => (
          <Link
            key={row.id}
            href="/admin/messages"
            className="block px-5 py-4 transition hover:bg-background"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="inline-flex items-center gap-2 font-display text-lg tracking-wide uppercase">
                {row.unread ? (
                  <span
                    className="size-1.5 rounded-full bg-brand"
                    aria-label="Unread"
                  />
                ) : null}
                {row.from}
              </p>
              <p className="text-xs text-muted">{row.when}</p>
            </div>
            <p className="mt-1 text-sm text-muted">{row.preview}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function CapacityList({
  rows,
  averagePercent,
}: {
  rows: CapacityRow[];
  averagePercent: number;
}) {
  return (
    <section>
      <SectionHeader eyebrow="Utilization" title="Capacity" />
      <p className="mt-2 text-sm text-muted">
        Average capacity{" "}
        <span className="font-semibold text-foreground">{averagePercent}%</span>
      </p>
      <div className="mt-5 divide-y divide-border border border-border bg-surface">
        {rows.map((row) => {
          const pct = capacityPercent(row.booked, row.capacity);
          return (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            >
              <p className="text-sm text-foreground">{row.label}</p>
              <div className="flex items-center gap-4">
                <div className="hidden h-1.5 w-24 overflow-hidden bg-border sm:block">
                  <div
                    className="h-full bg-brand"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <p className="text-right text-sm tabular-nums">
                  <span className="font-display text-lg tracking-wide">
                    {row.booked} / {row.capacity}
                  </span>
                  <span className="ml-2 text-xs text-muted">{pct}%</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function TopPrograms({ programs }: { programs: ProgramPopularity[] }) {
  return (
    <section>
      <SectionHeader eyebrow="Programs" title="Top programs" href="/admin/programs" />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {programs.map((p) => (
          <article key={p.id} className="border border-border bg-surface p-5">
            <p className="font-display text-xl tracking-wide uppercase">
              {p.name}
            </p>
            <p className="mt-4 font-display text-4xl tracking-wide">
              {p.members}
            </p>
            <p className="mt-1 text-xs text-muted">members</p>
            <p
              className={cn(
                "mt-3 text-sm font-semibold",
                p.changePercent >= 0 ? "hub-text-positive" : "text-brand",
              )}
            >
              {p.changePercent >= 0 ? "↑" : "↓"} {Math.abs(p.changePercent)}%
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <section>
      <SectionHeader eyebrow="Live" title="Recent activity" />
      <ul className="mt-5 divide-y divide-border border border-border bg-surface">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-4"
          >
            <p className="text-sm text-foreground">
              <span className="mr-2 hub-text-positive" aria-hidden>
                ✔
              </span>
              {item.text}
            </p>
            <p className="text-xs text-muted">{item.when}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
