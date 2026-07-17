import type { Metadata } from "next";
import Link from "next/link";

import { ProgramsLibraryNav } from "@/components/programs/programs-library-nav";
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
      detail: `${state.workouts.length} templates`,
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
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Operations
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase">
          Programs
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Exercise library, workout builder, multi-week programs, teams, and
          client assignment — TrainHeroic-style workflow in MA5.
        </p>
      </div>

      <ProgramsLibraryNav pathname="/admin/programs" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="border border-border bg-surface p-5 transition hover:border-brand/50"
          >
            <p className="font-display text-xl tracking-wide uppercase">
              {card.title}
            </p>
            <p className="mt-2 text-sm text-muted">{card.detail}</p>
          </Link>
        ))}
      </div>

      <p className="text-xs text-muted">
        Demo data persists in a browser cookie until Supabase migration{" "}
        <code className="text-foreground">003_programs.sql</code> is applied.
        Preview the athlete view at{" "}
        <Link href="/app/programs" className="text-brand hover:underline">
          /app/programs
        </Link>
        .
      </p>
    </div>
  );
}
