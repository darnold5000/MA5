import type { Metadata } from "next";

import { ProgramsLibraryNav } from "@/components/programs/programs-library-nav";
import { WorkoutsManager } from "@/components/programs/workouts-manager";
import { getProgramsState } from "@/features/programs/queries";

export const metadata: Metadata = {
  title: "Workouts · Programs",
  robots: { index: false, follow: false },
};

export default async function AdminWorkoutsPage() {
  const state = await getProgramsState();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Library
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase">
          Workouts
        </h1>
        <p className="mt-2 text-sm text-muted">
          Build sessions with lettered blocks, sets × reps, and exercise video.
        </p>
      </div>
      <ProgramsLibraryNav pathname="/admin/programs/workouts" />
      <WorkoutsManager
        workouts={state.workouts}
        blocks={state.workoutBlocks}
        exercises={state.exercises}
      />
    </div>
  );
}
