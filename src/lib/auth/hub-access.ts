import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";

/** True if the visitor can open /app without hitting login again. */
export async function hasFitnessHubAccess(): Promise<boolean> {
  if (!isSupabasePublicConfigured()) {
    return false;
  }
  const session = await getSessionUser();
  return Boolean(session);
}
