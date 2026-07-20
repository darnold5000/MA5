import type { Metadata } from "next";
import Link from "next/link";

import { ProgramsLightShell } from "@/components/programs/programs-light-shell";
import { ProgramsSectionNav } from "@/components/programs/programs-section-nav";
import { getProgramsState } from "@/features/programs/queries";

export const metadata: Metadata = {
  title: "Programs · Operations",
  robots: { index: false, follow: false },
};

export default async function AdminProgramsPage() {
  const state = await getProgramsState();

  const cards = [
    {
      href: "/admin/programs/library?tab=exercises",
      title: "Library",
      detail: `${state.exercises.length} exercises · ${state.workouts.length} sessions · ${state.programs.length} programs`,
    },
    {
      href: "/admin/programs/teams",
      title: "Small groups",
      detail: `${state.teams.length} groups · post today's class workout`,
    },
    {
      href: "/admin/programs/assign",
      title: "Assign",
      detail: "Client calendars & publish",
    },
  ];

  return (
    <ProgramsLightShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[var(--th-blue)]">
            Operations
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Programs</h1>
          <p className="mt-2 max-w-2xl text-sm th-muted">
            Build content in Library, post class workouts via Small groups, or
            assign 1-on-1 programs.
          </p>
        </div>

        <ProgramsSectionNav active="overview" />

        <div className="grid gap-3 sm:grid-cols-3">
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
