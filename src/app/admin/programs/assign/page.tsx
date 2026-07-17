import type { Metadata } from "next";

import { AssignCalendarManager } from "@/components/programs/assign-calendar-manager";
import { ProgramsLightShell } from "@/components/programs/programs-light-shell";
import { ProgramsSectionNav } from "@/components/programs/programs-section-nav";
import {
  getProgramsState,
  listClientsForPrograms,
} from "@/features/programs/queries";

export const metadata: Metadata = {
  title: "Assign · Programs",
  robots: { index: false, follow: false },
};

export default async function AdminAssignPage() {
  const state = await getProgramsState();
  const clients = listClientsForPrograms(state);

  return (
    <ProgramsLightShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[var(--th-blue)]">
            Programs
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Assign</h1>
          <p className="mt-2 text-sm th-muted">
            Individual client calendars — draft, publish, or assign a program.
          </p>
        </div>
        <ProgramsSectionNav active="assign" />
        <AssignCalendarManager
          clients={clients}
          workouts={state.workouts}
          programs={state.programs}
          calendarEntries={state.calendarEntries}
        />
      </div>
    </ProgramsLightShell>
  );
}
