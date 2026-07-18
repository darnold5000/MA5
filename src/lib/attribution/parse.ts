import type { AttributionTouch } from "@/lib/attribution/types";

function clean(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().slice(0, 500);
  return trimmed.length > 0 ? trimmed : null;
}

export function hasCampaignParams(touch: Pick<
  AttributionTouch,
  "utmSource" | "utmMedium" | "utmCampaign" | "utmTerm" | "utmContent"
>): boolean {
  return Boolean(
    touch.utmSource ||
      touch.utmMedium ||
      touch.utmCampaign ||
      touch.utmTerm ||
      touch.utmContent,
  );
}

export function parseAttributionFromSearchParams(
  searchParams: URLSearchParams,
  landingPage: string,
  referrer: string | null,
  capturedAt = new Date().toISOString(),
): AttributionTouch {
  return {
    utmSource: clean(searchParams.get("utm_source")),
    utmMedium: clean(searchParams.get("utm_medium")),
    utmCampaign: clean(searchParams.get("utm_campaign")),
    utmTerm: clean(searchParams.get("utm_term")),
    utmContent: clean(searchParams.get("utm_content")),
    landingPage: clean(landingPage),
    referrer: clean(referrer),
    capturedAt,
  };
}

export function serializeTouch(touch: AttributionTouch): string {
  return JSON.stringify({
    s: touch.utmSource,
    m: touch.utmMedium,
    c: touch.utmCampaign,
    t: touch.utmTerm,
    n: touch.utmContent,
    l: touch.landingPage,
    r: touch.referrer,
    a: touch.capturedAt,
  });
}

export function deserializeTouch(raw: string | undefined | null): AttributionTouch | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      utmSource: clean(typeof parsed.s === "string" ? parsed.s : null),
      utmMedium: clean(typeof parsed.m === "string" ? parsed.m : null),
      utmCampaign: clean(typeof parsed.c === "string" ? parsed.c : null),
      utmTerm: clean(typeof parsed.t === "string" ? parsed.t : null),
      utmContent: clean(typeof parsed.n === "string" ? parsed.n : null),
      landingPage: clean(typeof parsed.l === "string" ? parsed.l : null),
      referrer: clean(typeof parsed.r === "string" ? parsed.r : null),
      capturedAt:
        typeof parsed.a === "string" && parsed.a
          ? parsed.a
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function isValidVisitorId(value: string | undefined | null): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
