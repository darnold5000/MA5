import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";

export const HUB_BADGE_REFRESH_EVENT = "ma5-hub-refresh-badges";

/** Update shell unread badges without re-fetching the full RSC page. */
export function refreshHubBadges() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(HUB_BADGE_REFRESH_EVENT));
}

/**
 * Non-blocking server refresh after mutations — keeps buttons responsive
 * while RSC trees revalidate.
 */
export function useServerRefresh() {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
      window.dispatchEvent(new Event(HUB_BADGE_REFRESH_EVENT));
    });
  }, [router]);

  return { router, refresh, isRefreshing };
}
