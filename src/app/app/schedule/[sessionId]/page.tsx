import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BookSessionButton } from "@/components/booking/book-session-button";
import {
  formatMoney,
  formatSessionWhen,
  getSessionById,
} from "@/features/scheduling/queries";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export const metadata: Metadata = {
  title: "Session",
  robots: { index: false, follow: false },
};

export default async function SessionDetailPage({ params }: PageProps) {
  const { sessionId } = await params;
  const session = await getSessionById(sessionId);
  if (!session) notFound();

  const spots = Math.max(session.capacity - session.bookedCount, 0);
  const full = spots <= 0 || session.status === "full";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/app/schedule" className="text-sm text-muted hover:text-foreground">
        ← Back to schedule
      </Link>
      <div className="border border-border bg-surface p-6 sm:p-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          {formatSessionWhen(session.startsAt)}
        </p>
        <h2 className="mt-2 font-display text-3xl tracking-wide uppercase">
          {session.title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {session.description}
        </p>
        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs tracking-wide text-muted uppercase">Coach</dt>
            <dd>{session.coachName}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-muted uppercase">Location</dt>
            <dd>{session.locationName}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-muted uppercase">Capacity</dt>
            <dd>
              {full ? "Full" : `${spots} of ${session.capacity} open`}
            </dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-muted uppercase">Price</dt>
            <dd>
              {session.priceCents > 0
                ? formatMoney(session.priceCents)
                : "Included / inquire"}
            </dd>
          </div>
        </dl>
        <div className="mt-8">
          <BookSessionButton sessionId={session.id} disabled={full} />
        </div>
      </div>
    </div>
  );
}
