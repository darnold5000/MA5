import type { Metadata } from "next";

import { ScheduleBrowser } from "@/components/booking/schedule-browser";
import { listPublishedSessions } from "@/features/scheduling/queries";

export const metadata: Metadata = {
  title: "Book",
  robots: { index: false, follow: false },
};

export default async function SchedulePage() {
  const sessions = await listPublishedSessions();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Book
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase">
          Upcoming sessions
        </h1>
        <p className="mt-2 text-sm text-muted">
          Reserve assessments, small group training, sports performance, InBody,
          and sauna sessions.
        </p>
      </div>
      <ScheduleBrowser sessions={sessions} />
    </div>
  );
}
