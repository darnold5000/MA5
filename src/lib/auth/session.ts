import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";
import {
  type PlatformRole,
  PLATFORM_ROLES,
  canAccessAdmin,
} from "@/lib/permissions/roles";

export type Ma5Profile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  active: boolean;
  stripe_customer_id: string | null;
  invitation_status?: string | null;
  invited_at?: string | null;
  invitation_accepted_at?: string | null;
  last_login_at?: string | null;
  access_revoked_at?: string | null;
};

export type SessionUser = {
  id: string;
  email: string;
  profile: Ma5Profile | null;
  roles: PlatformRole[];
};

function isPlatformRole(value: string): value is PlatformRole {
  return (PLATFORM_ROLES as readonly string[]).includes(value);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  try {
    const [{ data: profile }, { data: roleRows }] = await Promise.all([
      supabase
        .from(MA5_TABLES.profiles)
        .select("id, email, full_name, phone, active, stripe_customer_id")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from(MA5_TABLES.userRoles)
        .select("role")
        .eq("user_id", user.id),
    ]);

    const roles = (roleRows ?? [])
      .map((row) => row.role as string)
      .filter(isPlatformRole);

    return {
      id: user.id,
      email: user.email ?? profile?.email ?? "",
      profile: profile ?? null,
      roles: roles.length > 0 ? roles : ["client"],
    };
  } catch {
    // Migration may not be applied yet — still treat the auth user as signed in.
    return {
      id: user.id,
      email: user.email ?? "",
      profile: null,
      roles: ["client"],
    };
  }
}

export async function requireSessionUser(): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) {
    throw new Error("Authentication required");
  }
  return session;
}

export async function requireAdminUser(): Promise<SessionUser> {
  const session = await requireSessionUser();
  if (!canAccessAdmin(session.roles)) {
    throw new Error("Admin access required");
  }
  return session;
}
