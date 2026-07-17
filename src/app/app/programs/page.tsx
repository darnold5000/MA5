import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ClientProgramsView } from "@/components/programs/client-programs-view";
import {
  getClientTrainingProgress,
  listClientProgramDays,
} from "@/features/programs/queries";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Programs",
  robots: { index: false, follow: false },
};

export default async function ProgramsPage() {
  const session = await getSessionUser();
  if (!session) {
    redirect("/login?next=/app/programs");
  }

  const email = session.email ?? session.profile?.email;
  const [days, progress] = await Promise.all([
    listClientProgramDays(session.id, email),
    getClientTrainingProgress(session.id, email),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Programs
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase">
          Today&apos;s training
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Start today&apos;s workout — progress and history are here when you
          need them.
        </p>
      </div>
      <ClientProgramsView
        days={days}
        progress={progress}
        clientUserId={session.id}
      />
    </div>
  );
}
