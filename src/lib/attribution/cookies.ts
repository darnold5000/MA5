import { cookies } from "next/headers";

import {
  FIRST_TOUCH_COOKIE,
  LAST_TOUCH_COOKIE,
  VISITOR_COOKIE,
} from "@/lib/attribution/constants";
import {
  deserializeTouch,
  isValidVisitorId,
} from "@/lib/attribution/parse";
import type { AttributionTouch } from "@/lib/attribution/types";

export type CookieAttribution = {
  visitorId: string | null;
  firstTouch: AttributionTouch | null;
  lastTouch: AttributionTouch | null;
};

export async function readAttributionFromCookies(): Promise<CookieAttribution> {
  const store = await cookies();
  const visitorRaw = store.get(VISITOR_COOKIE)?.value ?? null;
  return {
    visitorId: isValidVisitorId(visitorRaw) ? visitorRaw : null,
    firstTouch: deserializeTouch(store.get(FIRST_TOUCH_COOKIE)?.value),
    lastTouch: deserializeTouch(store.get(LAST_TOUCH_COOKIE)?.value),
  };
}
