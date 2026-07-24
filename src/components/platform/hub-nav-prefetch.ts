/** Routes where viewport prefetch is worth the server read cost. */
const ADMIN_PREFETCH = new Set([
  "/admin",
  "/admin/schedule",
  "/admin/clients",
  "/admin/messages",
]);

const APP_PREFETCH = new Set([
  "/app",
  "/app/schedule",
  "/app/messages",
]);

export function shouldPrefetchAdminNav(href: string): boolean {
  return ADMIN_PREFETCH.has(href);
}

export function shouldPrefetchAppNav(href: string): boolean {
  return APP_PREFETCH.has(href);
}
