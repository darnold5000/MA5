/**
 * Public environment values used by the client.
 * Never put Mindbody API secrets or staff credentials here.
 */
function readPublic(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export const env = {
  siteUrl: readPublic("NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000",
  mindbodyBookingUrl:
    readPublic("NEXT_PUBLIC_MINDBODY_BOOKING_URL") ??
    "https://www.mindbodyonline.com/explore/locations/ma5fitness-llc",
  // Public Mindbody Explore slug used as emergency fallback only.
  mindbodyLocationSlug: "ma5fitness-llc",
  mindbodyWidgets: {
    assessment: readPublic("NEXT_PUBLIC_MINDBODY_ASSESSMENT_WIDGET_ID"),
    group: readPublic("NEXT_PUBLIC_MINDBODY_GROUP_WIDGET_ID"),
    inbody: readPublic("NEXT_PUBLIC_MINDBODY_INBODY_WIDGET_ID"),
    sauna: readPublic("NEXT_PUBLIC_MINDBODY_SAUNA_WIDGET_ID"),
  },
  gaMeasurementId: readPublic("NEXT_PUBLIC_GA_MEASUREMENT_ID"),
} as const;

export type BookingWidgetKey = keyof typeof env.mindbodyWidgets;
