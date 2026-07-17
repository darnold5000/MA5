import type { Metadata } from "next";

import { ClientProgramsView } from "@/components/programs/client-programs-view";
import { listClientProgramDays } from "@/features/programs/queries";

export const metadata: Metadata = {
  title: "Programs",
  robots: { index: false, follow: false },
};

const DEMO_CLIENT_ID = "client-alex";

export default async function ProgramsPage() {
  const days = await listClientProgramDays(DEMO_CLIENT_ID);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Programs
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase">
          Your training plan
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Published workouts from your coach — individual and team assignments.
        </p>
      </div>
      <ClientProgramsView days={days} clientUserId={DEMO_CLIENT_ID} />
    </div>
  );
}
