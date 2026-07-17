import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClientThreadView } from "@/components/communication/client-messages";
import { getThreadMessages, loadCommunicationState } from "@/features/messaging";

export const metadata: Metadata = {
  title: "Conversation · MA5",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ threadId: string }> };

export default async function ClientMessageThreadPage({ params }: Props) {
  const { threadId } = await params;
  const state = await loadCommunicationState();
  const thread = state.threads.find((t) => t.id === threadId);
  if (!thread) notFound();

  const messages = getThreadMessages(state, threadId).map((m) => ({
    ...m,
    isMine: m.senderRole === "client",
  }));

  return <ClientThreadView thread={thread} messages={messages} />;
}
