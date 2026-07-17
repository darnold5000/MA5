import type { Metadata } from "next";

import { ClientMessagesHome } from "@/components/communication/client-messages";
import { loadCommunicationState } from "@/features/messaging";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Messages · MA5",
  robots: { index: false, follow: false },
};

export default async function ClientMessagesPage() {
  const state = await loadCommunicationState();
  const session =
    isSupabasePublicConfigured() && isSupabaseConfigured()
      ? await getSessionUser()
      : null;

  const threads = session
    ? state.threads.filter((t) => t.clientId === session.id)
    : state.threads.filter((t) => t.clientId === "client-alex");

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
