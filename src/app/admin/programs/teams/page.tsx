import type { Metadata } from "next";

import { ProgramsLibraryNav } from "@/components/programs/programs-library-nav";
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
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Programs
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase">
          Teams
        </h1>
        <p className="mt-2 text-sm text-muted">
          Shared calendars for group programming. Roster athletes, add days,
          assign programs, publish.
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
  );
}
