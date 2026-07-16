import { cookies } from "next/headers";

import {
  DEMO_PERSONA_COOKIE,
  isDemoPersona,
} from "@/content/demo-persona";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";

/** True if the visitor can open /app without hitting login again. */
export async function hasFitnessHubAccess(): Promise<boolean> {
  const jar = await cookies();
  const demo = jar.get(DEMO_PERSONA_COOKIE)?.value;
  if (isDemoPersona(demo) && demo === "client") {
    return true;
  }
  // Staff demo also can open client portal; treat as signed-in for header.
  if (isDemoPersona(demo)) {
    return true;
  }
  if (!isSupabasePublicConfigured()) {
    return false;
  }
  const session = await getSessionUser();
  return Boolean(session);
}
