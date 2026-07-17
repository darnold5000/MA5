import type { Metadata } from "next";

import { AdminAnnouncementsList } from "@/components/communication/admin-announcements-list";
import { loadCommunicationState } from "@/features/messaging";

export const metadata: Metadata = {
  title: "Announcements · Operations",
  robots: { index: false, follow: false },
};

export default async function AdminAnnouncementsPage() {
  const state = await loadCommunicationState();
  return (
    <div className="mx-auto max-w-3xl">
      <AdminAnnouncementsList announcements={state.announcements} />
    </div>
  );
}
