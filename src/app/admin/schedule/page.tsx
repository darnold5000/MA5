import type { Metadata } from "next";

import { AdminScheduleManager } from "@/components/admin/schedule-manager";
import { listAllSessions } from "@/features/scheduling/queries";

export const metadata: Metadata = {
  title: "Schedule · Operations",
  robots: { index: false, follow: false },
};

export default async function AdminSchedulePage() {
  const sessions = await listAllSessions();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Schedule
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase">
          Classes & appointments
        </h1>
      </div>
      <AdminScheduleManager sessions={sessions} />
    </div>
  );
}
