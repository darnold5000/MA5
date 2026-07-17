import type { Metadata } from "next";

import { AdminMessagesInbox } from "@/components/communication/admin-messages-inbox";
import { loadCommunicationState } from "@/features/messaging";

export const metadata: Metadata = {
  title: "Messages · Operations",
  robots: { index: false, follow: false },
};

export default async function AdminMessagesPage() {
  const state = await loadCommunicationState();
  return (
    <div className="mx-auto max-w-3xl">
      <AdminMessagesInbox
        threads={state.threads}
        clients={state.clients.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
