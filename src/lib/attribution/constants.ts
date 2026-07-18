/** First-party visitor + attribution cookies (90-day window). */
export const ATTRIBUTION_COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

export const VISITOR_COOKIE = "ma5_vid";
export const FIRST_TOUCH_COOKIE = "ma5_ft";
export const LAST_TOUCH_COOKIE = "ma5_lt";

export const UTM_PARAM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

export type UtmParamKey = (typeof UTM_PARAM_KEYS)[number];
