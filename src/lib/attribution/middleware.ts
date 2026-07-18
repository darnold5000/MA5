import { type NextRequest, type NextResponse } from "next/server";

import {
  ATTRIBUTION_COOKIE_MAX_AGE_SECONDS,
  FIRST_TOUCH_COOKIE,
  LAST_TOUCH_COOKIE,
  VISITOR_COOKIE,
} from "@/lib/attribution/constants";
import {
  deserializeTouch,
  hasCampaignParams,
  isValidVisitorId,
  parseAttributionFromSearchParams,
  serializeTouch,
} from "@/lib/attribution/parse";

const COOKIE_BASE = {
  path: "/",
  sameSite: "lax" as const,
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  maxAge: ATTRIBUTION_COOKIE_MAX_AGE_SECONDS,
};

function newVisitorId(): string {
  return crypto.randomUUID();
}

function shouldSkipPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/app") ||
    pathname.startsWith("/auth")
  );
}

/**
 * Capture visitor UUID + first-touch UTMs in cookies.
 * Never overwrites first-touch. Updates last-touch when campaign params appear.
 * DB persistence happens via /api/attribution/visit (client beacon).
 */
export function applyAttributionCookies(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const pathname = request.nextUrl.pathname;
  if (shouldSkipPath(pathname)) return response;

  let visitorId = request.cookies.get(VISITOR_COOKIE)?.value;
  if (!isValidVisitorId(visitorId)) {
    visitorId = newVisitorId();
    response.cookies.set(VISITOR_COOKIE, visitorId, COOKIE_BASE);
  }

  const landingPage = `${pathname}${request.nextUrl.search}`;
  const referrer = request.headers.get("referer");
  const incoming = parseAttributionFromSearchParams(
    request.nextUrl.searchParams,
    landingPage,
    referrer,
  );

  const existingFirst = deserializeTouch(
    request.cookies.get(FIRST_TOUCH_COOKIE)?.value,
  );

  if (!existingFirst) {
    // First touch: store even without UTMs (landing + referrer still useful)
    response.cookies.set(
      FIRST_TOUCH_COOKIE,
      serializeTouch(incoming),
      COOKIE_BASE,
    );
  }

  if (hasCampaignParams(incoming)) {
    response.cookies.set(
      LAST_TOUCH_COOKIE,
      serializeTouch(incoming),
      COOKIE_BASE,
    );
  } else if (!request.cookies.get(LAST_TOUCH_COOKIE)?.value && !existingFirst) {
    response.cookies.set(
      LAST_TOUCH_COOKIE,
      serializeTouch(incoming),
      COOKIE_BASE,
    );
  }

  return response;
}
