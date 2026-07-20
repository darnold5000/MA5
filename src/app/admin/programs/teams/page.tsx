import type { Metadata } from "next";

import { ProgramsLightShell } from "@/components/programs/programs-light-shell";
import { ProgramsSectionNav } from "@/components/programs/programs-section-nav";
import { TeamsManager } from "@/components/programs/teams-manager";
import {
  getProgramsState,
  listRosterClients,
} from "@/features/programs/queries";

export const metadata: Metadata = {
  title: "Small groups · Programs",
  robots: { index: false, follow: false },
};

export default async function AdminTeamsPage() {
  const [state, clients] = await Promise.all([
    getProgramsState(),
    listRosterClients(),
  ]);

  return (
    <ProgramsLightShell>
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[var(--th-blue)]">
            Programs
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Small groups</h1>
          <p className="mt-2 text-sm th-muted">
            Post today&apos;s class workout to a roster — only athletes on that
            group see it and can log weights during class.
          </p>
        </div>
        <ProgramsSectionNav active="teams" />
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
