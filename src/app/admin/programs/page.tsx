import type { Metadata } from "next";
import Link from "next/link";

import { ProgramsLibraryNav } from "@/components/programs/programs-library-nav";
import { ProgramsLightShell } from "@/components/programs/programs-light-shell";
import { getProgramsState } from "@/features/programs/queries";

export const metadata: Metadata = {
  title: "Programs · Operations",
  robots: { index: false, follow: false },
};

export default async function AdminProgramsPage() {
  const state = await getProgramsState();

  const cards = [
    {
      href: "/admin/programs/exercises",
      title: "Exercises",
      detail: `${state.exercises.length} in library`,
    },
    {
      href: "/admin/programs/workouts",
      title: "Workouts",
      detail: `${state.workouts.length} templates · sets & reps`,
    },
    {
      href: "/admin/programs/library",
      title: "Programs",
      detail: `${state.programs.length} multi-week`,
    },
    {
      href: "/admin/programs/teams",
      title: "Teams",
      detail: `${state.teams.length} teams`,
    },
    {
      href: "/admin/programs/assign",
      title: "Assign",
      detail: "Client calendars",
    },
  ];

  return (
    <ProgramsLightShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[var(--th-blue)]">
            Library
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--th-text)]">
            Programs
          </h1>
          <p className="mt-2 max-w-2xl text-sm th-muted">
            Light TrainHeroic-style programming workspace. Build exercises,
            then prescribe sets &amp; reps on Workouts.
          </p>
        </div>

        <ProgramsLibraryNav pathname="/admin/programs" />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="th-card p-5 transition hover:border-[var(--th-blue)]"
            >
              <p className="text-lg font-bold">{card.title}</p>
              <p className="mt-2 text-sm th-muted">{card.detail}</p>
            </Link>
          ))}
        </div>
      </div>
    </ProgramsLightShell>
  );
}
