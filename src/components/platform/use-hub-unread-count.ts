"use client";

import { useCallback, useEffect, useState } from "react";

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
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  return { count, refresh };
}
