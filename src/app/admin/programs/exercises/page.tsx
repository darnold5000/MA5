import type { Metadata } from "next";

import { ExercisesManager } from "@/components/programs/exercises-manager";
import { ProgramsLibraryNav } from "@/components/programs/programs-library-nav";
import { getProgramsState } from "@/features/programs/queries";

export const metadata: Metadata = {
  title: "Exercises · Programs",
  robots: { index: false, follow: false },
};

export default async function AdminExercisesPage() {
  const state = await getProgramsState();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Library
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase">
          Exercises
        </h1>
        <p className="mt-2 text-sm text-muted">
          Form video + points of performance. Upload native video or paste
          YouTube / Vimeo.
        </p>
      </div>
      <ProgramsLibraryNav pathname="/admin/programs/exercises" />
      <ExercisesManager exercises={state.exercises} />
    </div>
  );
}
