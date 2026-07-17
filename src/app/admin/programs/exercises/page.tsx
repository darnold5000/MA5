import type { Metadata } from "next";

import { ExercisesManager } from "@/components/programs/exercises-manager";
import { ProgramsLibraryNav } from "@/components/programs/programs-library-nav";
import { ProgramsLightShell } from "@/components/programs/programs-light-shell";
import { getProgramsState } from "@/features/programs/queries";

export const metadata: Metadata = {
  title: "Exercises · Programs",
  robots: { index: false, follow: false },
};

export default async function AdminExercisesPage() {
  const state = await getProgramsState();

  return (
    <ProgramsLightShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[var(--th-blue)]">
            Library
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Exercises</h1>
          <p className="mt-2 text-sm th-muted">
            Movement library — video + points of performance. Sets &amp; reps
            live on each workout block.
          </p>
        </div>
        <ProgramsLibraryNav pathname="/admin/programs/exercises" />
        <ExercisesManager exercises={state.exercises} />
      </div>
    </ProgramsLightShell>
  );
}
