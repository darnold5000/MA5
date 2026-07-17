import type { Metadata } from "next";

import { ProgramGridManager } from "@/components/programs/program-grid-manager";
import { ProgramsLibraryNav } from "@/components/programs/programs-library-nav";
import { getProgramsState } from "@/features/programs/queries";

export const metadata: Metadata = {
  title: "Program library · Programs",
  robots: { index: false, follow: false },
};

export default async function AdminProgramLibraryPage() {
  const state = await getProgramsState();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Library
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase">
          Programs
        </h1>
        <p className="mt-2 text-sm text-muted">
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
  );
}
