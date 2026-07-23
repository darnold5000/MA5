import { NextResponse } from "next/server";

import {
  accessDeniedResponse,
  isActiveAccess,
  resolveAccessState,
  resolveClientStatus,
  type AccessState,
} from "@/lib/auth/access";
import { portalStatusMessage } from "@/lib/auth/client-lifecycle";
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
  tenant_id?: string | null;
  invitation_status?: string | null;
  client_status?: string | null;
  invited_at?: string | null;
  invitation_accepted_at?: string | null;
  last_login_at?: string | null;
  access_revoked_at?: string | null;
  deleted_at?: string | null;
};

export type SessionUser = {
  id: string;
  email: string;
  profile: Ma5Profile | null;
  roles: PlatformRole[];
  access: AccessState;
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
    const [{ data: profile, error: profileError }, { data: roleRows }] =
      await Promise.all([
        supabase
          .from(MA5_TABLES.profiles)
          .select(
            "id, email, full_name, phone, active, stripe_customer_id, tenant_id, invitation_status, client_status, invited_at, invitation_accepted_at, last_login_at, access_revoked_at, deleted_at",
          )
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from(MA5_TABLES.userRoles)
          .select("role")
          .eq("user_id", user.id),
      ]);

    let resolvedProfile = profile as Ma5Profile | null;

    if (profileError) {
      const { data: basic } = await supabase
        .from(MA5_TABLES.profiles)
        .select("id, email, full_name, phone, active, stripe_customer_id")
        .eq("id", user.id)
        .maybeSingle();
      resolvedProfile = (basic as Ma5Profile | null) ?? null;
    }

    const roles = (roleRows ?? [])
      .map((row) => row.role as string)
      .filter(isPlatformRole);

    return {
      id: user.id,
      email: user.email ?? resolvedProfile?.email ?? "",
      profile: resolvedProfile,
      roles: roles.length > 0 ? roles : ["client"],
      access: resolveAccessState(resolvedProfile),
    };
  } catch {
    return {
      id: user.id,
      email: user.email ?? "",
      profile: null,
      roles: ["client"],
      access: "active",
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

/** Authenticated + active MA5 access (not pending invite / revoked). */
export async function requireActiveSessionUser(): Promise<SessionUser> {
  const session = await requireSessionUser();
  if (!isActiveAccess(session)) {
    throw new Error("Access disabled");
  }
  return session;
}

export async function requireAdminUser(): Promise<SessionUser> {
  const session = await requireActiveSessionUser();
  if (!canAccessAdmin(session.roles)) {
    throw new Error("Admin access required");
  }
  return session;
}

/**
 * For route handlers: require signed-in active user.
 * Returns a NextResponse on failure, or the session on success.
 */
export async function requireActiveSessionOrResponse(): Promise<
  SessionUser | NextResponse
> {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (!isActiveAccess(session)) {
    return accessDeniedResponse(session.access);
  }
  return session;
}

/**
 * For route handlers: require signed-in active admin/staff.
 */
export async function requireAdminSessionOrResponse(): Promise<
  SessionUser | NextResponse
> {
  const session = await requireActiveSessionOrResponse();
  if (session instanceof NextResponse) return session;
  if (!canAccessAdmin(session.roles)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  return session;
}

export { resolveAccessState, isActiveAccess, accessDeniedResponse, resolveClientStatus, portalStatusMessage };
