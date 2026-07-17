import type { Metadata } from "next";

import {
  LibraryWorkspace,
  type LibraryTab,
} from "@/components/programs/library-workspace";
import { ProgramsLightShell } from "@/components/programs/programs-light-shell";
import { ProgramsSectionNav } from "@/components/programs/programs-section-nav";
import { getProgramsState } from "@/features/programs/queries";

export const metadata: Metadata = {
  title: "Library · Programs",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

function parseTab(raw: string | undefined): LibraryTab {
  if (raw === "programs" || raw === "sessions" || raw === "exercises") {
    return raw;
  }
  return "exercises";
}

export default async function AdminLibraryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const state = await getProgramsState();

  return (
    <ProgramsLightShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[var(--th-blue)]">
            Programs
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Library</h1>
          <p className="mt-2 text-sm th-muted">
            One place for programs, sessions, and exercises — switch tabs to
            browse, edit, delete, or create.
          </p>
        </div>

        <ProgramsSectionNav active="library" />

        <LibraryWorkspace
          initialTab={parseTab(params.tab)}
          exercises={state.exercises}
          workouts={state.workouts}
          workoutBlocks={state.workoutBlocks}
          programs={state.programs}
          programDays={state.programDays}
        />
      </div>
    </ProgramsLightShell>
  );
}
