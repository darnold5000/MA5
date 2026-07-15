import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Messages",
  robots: { index: false, follow: false },
};

export default function MessagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Messages
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase">
          Coach inbox
        </h1>
      </div>
      <article className="border border-border bg-surface p-5">
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Robert Anderson
        </p>
        <h2 className="mt-2 font-display text-xl tracking-wide uppercase">
          This week’s plan
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Great work this week. Let’s keep Thursday’s small group on the schedule
          and add one recovery session.
        </p>
        <p className="mt-4 text-xs text-muted">Today · unread</p>
      </article>
    </div>
  );
}
