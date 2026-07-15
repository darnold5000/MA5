import type { Metadata } from "next";

import { AdminRosterManager } from "@/components/admin/roster-manager";
import { readOpsState } from "@/features/admin/ops-store";
import { listAllSessions } from "@/features/scheduling/queries";

export const metadata: Metadata = {
  title: "Check-in roster",
  robots: { index: false, follow: false },
};

export default async function AdminBookingsPage() {
  const [sessions, ops] = await Promise.all([listAllSessions(), readOpsState()]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Roster
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase">
          Check-in & class list
        </h1>
        <p className="mt-2 text-sm text-muted">
          Add people to a class, check them in, mark no-shows, cancel spots, or
          remove them.
        </p>
      </div>
      <AdminRosterManager
        sessions={sessions}
        roster={ops.roster}
        clients={ops.clients}
      />
    </div>
  );
}
