import type { Metadata } from "next";

import { ClientAnnouncementsList } from "@/components/communication/client-messages";
import { loadCommunicationState } from "@/features/messaging";

export const metadata: Metadata = {
  title: "Announcements · MA5",
  robots: { index: false, follow: false },
};

export default async function ClientAnnouncementsPage() {
  const state = await loadCommunicationState();
  return <ClientAnnouncementsList announcements={state.announcements} />;
}
