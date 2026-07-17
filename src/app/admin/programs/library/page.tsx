import type { Metadata } from "next";

import { ProgramGridManager } from "@/components/programs/program-grid-manager";
import { ProgramsLibraryNav } from "@/components/programs/programs-library-nav";
import { ProgramsLightShell } from "@/components/programs/programs-light-shell";
import { getProgramsState } from "@/features/programs/queries";

export const metadata: Metadata = {
  title: "Program library · Programs",
  robots: { index: false, follow: false },
};

export default async function AdminProgramLibraryPage() {
  const state = await getProgramsState();

  return (
    <ProgramsLightShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[var(--th-blue)]">
            Library
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Programs</h1>
          <p className="mt-2 text-sm th-muted">
            Multi-week grids. Drop workouts into days, then assign to clients or
            teams.
          </p>
        </div>
        <ProgramsLibraryNav pathname="/admin/programs/library" />
        <ProgramGridManager
          programs={state.programs}
          programDays={state.programDays}
          workouts={state.workouts}
        />
      </div>
    </ProgramsLightShell>
  );
}
