import type { Metadata } from "next";

import { AssignCalendarManager } from "@/components/programs/assign-calendar-manager";
import { ProgramsLibraryNav } from "@/components/programs/programs-library-nav";
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
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Programs
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase">
          Assign
        </h1>
        <p className="mt-2 text-sm text-muted">
          Individual client calendars — draft days, publish, or assign a full
          program.
        </p>
      </div>
      <ProgramsLibraryNav pathname="/admin/programs/assign" />
      <AssignCalendarManager
        clients={clients}
        workouts={state.workouts}
        programs={state.programs}
        calendarEntries={state.calendarEntries}
      />
    </div>
  );
}
