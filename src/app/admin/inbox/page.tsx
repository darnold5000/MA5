import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Inbox · Operations",
  robots: { index: false, follow: false },
};

const THREADS = [
  {
    from: "Alex Rivera",
    preview: "Can I switch Thursday to Friday?",
    when: "12 min ago",
    unread: true,
  },
  {
    from: "Jordan Lee",
    preview: "Thanks for the form check yesterday.",
    when: "Yesterday",
    unread: true,
  },
  {
    from: "Sam Patel",
    preview: "When does my pause end?",
    when: "Mon",
    unread: false,
  },
] as const;

export default function AdminInboxPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Operations
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase">
          Inbox
        </h1>
        <p className="mt-2 text-sm text-muted">
          Coach ↔ client messages that need a reply. Client Inbox lives in the
          Fitness Hub.
        </p>
      </div>

      <div className="divide-y divide-border border border-border bg-surface">
        {THREADS.map((t) => (
          <article key={t.from} className="px-5 py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="inline-flex items-center gap-2 font-display text-lg tracking-wide uppercase">
                {t.unread ? (
                  <span
                    className="size-1.5 rounded-full bg-brand"
                    aria-label="Unread"
                  />
                ) : null}
                {t.from}
              </p>
              <p className="text-xs text-muted">{t.when}</p>
            </div>
            <p className="mt-1 text-sm text-muted">{t.preview}</p>
            <button
              type="button"
              className="mt-3 inline-flex min-h-10 items-center border border-border px-3 text-[11px] font-semibold tracking-wide uppercase"
            >
              Reply
            </button>
          </article>
        ))}
      </div>

      <Link
        href="/app/inbox"
        className="inline-flex text-xs font-semibold tracking-wide text-brand uppercase hover:underline"
      >
        Open client Inbox →
      </Link>
    </div>
  );
}
