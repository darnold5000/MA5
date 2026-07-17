"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

/**
 * Optional Realtime subscriptions. Correctness does not depend on Realtime —
 * pages still refresh on navigation / mark-read / send.
 */
export function useCommunicationRealtime(options: {
  userId?: string | null;
  threadId?: string | null;
  enabled?: boolean;
}) {
  const router = useRouter();
  const enabled = options.enabled !== false;

  useEffect(() => {
    if (!enabled || !options.userId) return;

    let supabase: ReturnType<typeof createClient> | null = null;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    const channels: { unsubscribe?: () => void }[] = [];

    const notifChannel = supabase
      .channel(`ma5-notif-${options.userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ma5_notifications",
          filter: `user_id=eq.${options.userId}`,
        },
        () => router.refresh(),
      )
      .subscribe();
    channels.push(notifChannel);

    if (options.threadId) {
      const msgChannel = supabase
        .channel(`ma5-msg-${options.threadId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "ma5_messages",
            filter: `thread_id=eq.${options.threadId}`,
          },
          () => router.refresh(),
        )
        .subscribe();
      channels.push(msgChannel);
    }

    return () => {
      for (const ch of channels) {
        void supabase?.removeChannel(
          ch as Parameters<NonNullable<typeof supabase>["removeChannel"]>[0],
        );
      }
    };
  }, [enabled, options.userId, options.threadId, router]);
}
