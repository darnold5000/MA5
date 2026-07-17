import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClientWorkoutPlayer } from "@/components/programs/client-programs-view";
import { listClientProgramDays } from "@/features/programs/queries";

export const metadata: Metadata = {
  title: "Workout · Programs",
  robots: { index: false, follow: false },
};

const DEMO_CLIENT_ID = "client-alex";

type PageProps = {
  params: Promise<{ entryId: string }>;
};

export default async function ClientWorkoutPage({ params }: PageProps) {
  const { entryId } = await params;
  const days = await listClientProgramDays(DEMO_CLIENT_ID);
  const day = days.find((d) => d.entry.id === entryId);
  if (!day) notFound();

  return (
    <ClientWorkoutPlayer day={day} clientUserId={DEMO_CLIENT_ID} />
  );
}
