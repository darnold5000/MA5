export function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean>,
) {
  // TODO: Connect to Vercel Analytics, GA4, or the selected analytics provider.
  if (process.env.NODE_ENV === "development") {
    console.info("[analytics]", name, properties ?? {});
  }
}
