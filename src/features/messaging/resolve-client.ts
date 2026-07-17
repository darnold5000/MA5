import { TEST_CLIENT_EMAIL } from "@/content/demo-persona";
import type { createClient } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Demo persona ids used in cookie/demo UI — not real auth.users ids. */
export const DEMO_CLIENT_EMAILS: Record<string, string> = {
  "client-alex": TEST_CLIENT_EMAIL,
  "client-jordan": "jordan@example.com",
  "client-emily": "emily@example.com",
};

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function isDemoEntityId(value: string): boolean {
  return (
    value.startsWith("client-") ||
    value.startsWith("thread-") ||
    value.startsWith("msg-") ||
    value.startsWith("ann-") ||
    value.startsWith("notif-") ||
    value.startsWith("coach-")
  );
}

/**
 * Map UI client id → real ma5_profiles.id.
 * Demo ids like `client-alex` resolve via known test emails.
 */
export async function resolveClientProfileId(
  supabase: Supabase,
  clientId: string,
): Promise<{ id: string; fullName: string | null; email: string | null } | null> {
  if (isUuid(clientId)) {
    const { data } = await supabase
      .from(MA5_TABLES.profiles)
      .select("id, full_name, email")
      .eq("id", clientId)
      .maybeSingle();
    if (!data) return null;
    return {
      id: String(data.id),
      fullName: (data.full_name as string | null) ?? null,
      email: (data.email as string | null) ?? null,
    };
  }

  const email = DEMO_CLIENT_EMAILS[clientId];
  if (!email) return null;

  const { data } = await supabase
    .from(MA5_TABLES.profiles)
    .select("id, full_name, email")
    .eq("email", email)
    .maybeSingle();

  if (!data) return null;
  return {
    id: String(data.id),
    fullName: (data.full_name as string | null) ?? null,
    email: (data.email as string | null) ?? null,
  };
}

/** Load active clients for the admin message composer. */
export async function loadMessageableClients(supabase: Supabase): Promise<
  {
    id: string;
    name: string;
    avatarUrl: string | null;
    membershipLabel: string | null;
    programLabel: string | null;
  }[]
> {
  const { data: roles } = await supabase
    .from(MA5_TABLES.userRoles)
    .select("user_id")
    .eq("role", "client");

  const ids = [...new Set((roles ?? []).map((r) => String(r.user_id)))];
  if (ids.length === 0) return [];

  const { data: profiles } = await supabase
    .from(MA5_TABLES.profiles)
    .select("id, full_name, email, avatar_url")
    .in("id", ids)
    .eq("active", true);

  return (profiles ?? []).map((p) => ({
    id: String(p.id),
    name:
      (p.full_name as string | null)?.trim() ||
      (p.email as string | null) ||
      "Client",
    avatarUrl: (p.avatar_url as string | null) ?? null,
    membershipLabel: null,
    programLabel: null,
  }));
}
