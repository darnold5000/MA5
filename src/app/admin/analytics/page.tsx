import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics · Operations",
  robots: { index: false, follow: false },
};

const METRICS = [
  { label: "Revenue", value: "+12%", note: "vs last month" },
  { label: "Attendance", value: "+9%", note: "vs last month" },
  { label: "Retention", value: "96%", note: "active members" },
  { label: "Utilization", value: "84%", note: "session capacity" },
] as const;

const INSIGHTS = [
  "Friday classes are filling fastest. Recommend opening another session.",
  "15 members haven’t booked in over two weeks.",
  "Recovery room usage is down 32%.",
  "Strength programs have the highest completion rate.",
] as const;

export default function AdminAnalyticsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Operations
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase">
          Business health
        </h1>
        <p className="mt-2 text-sm text-muted">
          Demo metrics — live analytics ship with the Analytics + AI module.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {METRICS.map((m) => (
          <div key={m.label} className="border border-border bg-surface p-5">
            <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">
              {m.label}
            </p>
            <p className="mt-4 font-display text-4xl tracking-wide">{m.value}</p>
            <p className="mt-2 text-xs text-muted">{m.note}</p>
          </div>
        ))}
      </section>

      <section className="border border-border bg-surface p-5 sm:p-6">
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Today&apos;s insights
        </p>
        <ul className="mt-4 divide-y divide-border">
          {INSIGHTS.map((text) => (
            <li key={text} className="py-4 text-sm leading-relaxed text-foreground">
              {text}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
