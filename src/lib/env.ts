/**
 * Public environment values used by the client.
 * Never put Mindbody API secrets, Stripe secrets, or service-role keys here.
 */
function readPublic(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

/** Canonical site origin for auth redirect URLs (no trailing slash). */
export function resolveSiteUrl(): string {
  const raw = readPublic("NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export const env = {
  siteUrl: resolveSiteUrl(),
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
  supabaseUrl: readPublic("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: readPublic("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  /** Public VAPID key for Web Push subscribe (safe to expose). */
  vapidPublicKey: readPublic("NEXT_PUBLIC_VAPID_PUBLIC_KEY"),
} as const;

export function isSupabasePublicConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export type BookingWidgetKey = keyof typeof env.mindbodyWidgets;
