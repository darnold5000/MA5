import type { Metadata } from "next";

import { ProgramsLibraryNav } from "@/components/programs/programs-library-nav";
import { ProgramsLightShell } from "@/components/programs/programs-light-shell";
import { WorkoutsManager } from "@/components/programs/workouts-manager";
import { getProgramsState } from "@/features/programs/queries";

export const metadata: Metadata = {
  title: "Workouts · Programs",
  robots: { index: false, follow: false },
};

export default async function AdminWorkoutsPage() {
  const state = await getProgramsState();

  return (
    <ProgramsLightShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[var(--th-blue)]">
            Library
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Workouts</h1>
          <p className="mt-2 text-sm th-muted">
            Session builder — exercise dropdown, filter, video, and sets × reps
            side by side.
          </p>
        </div>
        <ProgramsLibraryNav pathname="/admin/programs/workouts" />
        <WorkoutsManager
          workouts={state.workouts}
          blocks={state.workoutBlocks}
          exercises={state.exercises}
        />
      </div>
    </ProgramsLightShell>
  );
}
