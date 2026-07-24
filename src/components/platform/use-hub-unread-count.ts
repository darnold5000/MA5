"use client";

import { useCallback, useEffect, useState } from "react";

import { HUB_BADGE_REFRESH_EVENT } from "@/hooks/use-server-refresh";

let inFlight: Promise<number | null> | null = null;
let lastFocusRefresh = 0;
const FOCUS_DEBOUNCE_MS = 5_000;

async function fetchUnreadCount(staff: boolean): Promise<number | null> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const res = await fetch(
        `/api/notifications/unread-count?staff=${staff ? "1" : "0"}`,
        { cache: "no-store" },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { count?: number };
      return typeof data.count === "number" ? data.count : 0;
    } catch {
      return null;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export function useHubUnreadCount(staff: boolean) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    const next = await fetchUnreadCount(staff);
    if (next !== null) setCount(next);
  }, [staff]);

  useEffect(() => {
    void refresh();
    const onFocus = () => {
      const now = Date.now();
      if (now - lastFocusRefresh < FOCUS_DEBOUNCE_MS) return;
      lastFocusRefresh = now;
      void refresh();
    };
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
