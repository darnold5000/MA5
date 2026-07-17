import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ClientWorkoutPlayer } from "@/components/programs/client-programs-view";
import { listClientProgramDays } from "@/features/programs/queries";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Workout · Programs",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ entryId: string }>;
};

export default async function ClientWorkoutPage({ params }: PageProps) {
  const session = await getSessionUser();
  if (!session) {
    redirect("/login?next=/app/programs");
  }

  const { entryId } = await params;
  const days = await listClientProgramDays(session.id);
  const day = days.find((d) => d.entry.id === entryId);
  if (!day) notFound();

  return <ClientWorkoutPlayer day={day} clientUserId={session.id} />;
}
