"use client";

import { useEffect, useRef } from "react";

/**
 * Beacons anonymous visit persistence once per page load on marketing routes.
 * Cookies (visitor id + first-touch) are set by middleware.
 */
export function AttributionTracker() {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    const path = `${window.location.pathname}${window.location.search}`;
    void fetch("/api/attribution/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
      keepalive: true,
    }).catch(() => {
      // Best-effort; attribution cookies still work for lead capture
    });
  }, []);

  return null;
}
