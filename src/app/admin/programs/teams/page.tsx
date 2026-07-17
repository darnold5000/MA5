import type { Metadata } from "next";

import { ProgramsLibraryNav } from "@/components/programs/programs-library-nav";
import { ProgramsLightShell } from "@/components/programs/programs-light-shell";
import { TeamsManager } from "@/components/programs/teams-manager";
import {
  getProgramsState,
  listClientsForPrograms,
} from "@/features/programs/queries";

export const metadata: Metadata = {
  title: "Teams · Programs",
  robots: { index: false, follow: false },
};

export default async function AdminTeamsPage() {
  const state = await getProgramsState();
  const clients = listClientsForPrograms(state);

  return (
    <ProgramsLightShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[var(--th-blue)]">
            Programs
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Teams</h1>
          <p className="mt-2 text-sm th-muted">
            Shared calendars for group programming.
          </p>
        </div>
        <ProgramsLibraryNav pathname="/admin/programs/teams" />
        <TeamsManager
          teams={state.teams}
          teamMembers={state.teamMembers}
          calendarEntries={state.calendarEntries}
          workouts={state.workouts}
          programs={state.programs}
          clients={clients}
        />
      </div>
    </ProgramsLightShell>
  );
}
