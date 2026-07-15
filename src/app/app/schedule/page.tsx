import type { Metadata } from "next";

import { ScheduleSessionList } from "@/components/booking/schedule-session-list";
import { StatusBanner } from "@/components/platform/status-banner";
import {
  formatMoney,
  formatSessionWhen,
  listPublishedSessions,
} from "@/features/scheduling/queries";

export const metadata: Metadata = {
  title: "Schedule",
  robots: { index: false, follow: false },
};

export default async function SchedulePage() {
  const sessions = await listPublishedSessions();
  const usingDemo = sessions.every((s) => s.source === "demo");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl tracking-wide uppercase">
          Upcoming sessions
        </h2>
        <p className="mt-2 text-sm text-muted">
          Native MA5 schedule — assessments, small group, sports performance,
          InBody, and sauna.
        </p>
      </div>

      {usingDemo ? (
        <StatusBanner tone="warning" title="Demo schedule">
          Showing sample sessions so you can evaluate booking UX before Supabase
          is connected.
        </StatusBanner>
      ) : null}

      <ScheduleSessionList
        sessions={sessions}
        formatWhen={formatSessionWhen}
        formatMoney={formatMoney}
      />
    </div>
  );
}
