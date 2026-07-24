"use client";

import { useCallback, useEffect, useState } from "react";

import { HUB_BADGE_REFRESH_EVENT } from "@/hooks/use-server-refresh";

export function useHubUnreadCount(staff: boolean) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/notifications/unread-count?staff=${staff ? "1" : "0"}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = (await res.json()) as { count?: number };
      setCount(typeof data.count === "number" ? data.count : 0);
    } catch {
      /* ignore */
    }
  }, [staff]);

  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    const onBadgeRefresh = () => void refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener(HUB_BADGE_REFRESH_EVENT, onBadgeRefresh);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(HUB_BADGE_REFRESH_EVENT, onBadgeRefresh);
    };
  }, [refresh]);

  return { count, refresh };
}
