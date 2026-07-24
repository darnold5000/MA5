import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { canAccessAdmin } from "@/lib/permissions/roles";

export type HubPortalLink = {
  signedIn: boolean;
  /** Where the marketing header should send signed-in users */
  href: "/app" | "/admin" | null;
};

/** Signed-in destination for the public site header (staff → Operations). */
export async function resolveHubPortalLink(): Promise<HubPortalLink> {
  if (!isSupabasePublicConfigured()) {
    return { signedIn: false, href: null };
  }
  const session = await getSessionUser();
  if (!session) {
    return { signedIn: false, href: null };
  }
  if (canAccessAdmin(session.roles)) {
    return { signedIn: true, href: "/admin" };
  }
  return { signedIn: true, href: "/app" };
}

/** @deprecated Use resolveHubPortalLink */
export async function hasFitnessHubAccess(): Promise<boolean> {
  const link = await resolveHubPortalLink();
  return link.signedIn;
}
