import type { Metadata } from "next";

import { ClientMessagesHome } from "@/components/communication/client-messages";
import { loadCommunicationState } from "@/features/messaging";

export const metadata: Metadata = {
  title: "Messages · MA5",
  robots: { index: false, follow: false },
};

export default async function ClientMessagesPage() {
  const state = await loadCommunicationState();
  // Demo persona is Alex; with real auth, queries scope by session
  const mine = state.threads.filter((t) => t.clientId === "client-alex");
  const threads = mine.length ? mine : state.threads.slice(0, 1);

  const unreadMessages = threads.reduce((s, t) => s + t.unreadCount, 0);
  const unreadAnnouncements = state.announcements.filter(
    (a) =>
      (a.status === "published" || a.status === "expired") && !a.readAt,
  ).length;

  return (
    <ClientMessagesHome
      threads={threads}
      announcements={state.announcements}
      unreadMessages={unreadMessages}
      unreadAnnouncements={unreadAnnouncements}
    />
  );
}
