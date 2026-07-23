import { isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";
import { isMa5DeploymentConfigured } from "@/lib/tenant/deployment";
import { createMa5TenantServiceClient } from "@/lib/tenant/service";
import {
  asClientStatus,
  deriveClientStatusFromLegacy,
} from "@/lib/auth/client-lifecycle";

import type { InvitationStatus, MemberDirectoryRow } from "./types";

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  active: boolean;
  invitation_status: string | null;
  invited_at: string | null;
  invitation_accepted_at: string | null;
  activated_at: string | null;
  last_login_at: string | null;
  access_revoked_at: string | null;
  invite_revoked_at: string | null;
  paused_at: string | null;
  deleted_at: string | null;
  status_before_delete: string | null;
  client_status: string | null;
  admin_notes: string | null;
};

function asInvitationStatus(value: string | null | undefined): InvitationStatus {
  const allowed: InvitationStatus[] = [
    "none",
    "pending",
    "sent",
    "accepted",
    "expired",
    "revoked",
    "failed",
  ];
  if (value && (allowed as string[]).includes(value)) {
    return value as InvitationStatus;
  }
  return "none";
}

export type ListDirectoryMembersOptions = {
  includeDeleted?: boolean;
};

export async function listDirectoryMembers(
  options: ListDirectoryMembersOptions = {},
): Promise<MemberDirectoryRow[]> {
  if (
    !isSupabaseConfigured() ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !isMa5DeploymentConfigured()
  ) {
    return [];
  }

  const { supabase: admin, ctx } = createMa5TenantServiceClient();
  const { data: roleRows, error: roleError } = await admin
    .from(MA5_TABLES.userRoles)
    .select("user_id, role")
    .eq("tenant_id", ctx.tenantId)
    .in("role", ["client", "coach", "admin", "staff", "owner"]);

  if (roleError) {
    console.error("[members] list roles", roleError);
    return [];
  }

  const ROLE_RANK: Record<MemberDirectoryRow["role"], number> = {
    owner: 5,
    admin: 4,
    staff: 3,
    coach: 2,
    client: 1,
  };
  const roleByUser = new Map<string, MemberDirectoryRow["role"]>();
  for (const row of roleRows ?? []) {
    const next = row.role as MemberDirectoryRow["role"];
    if (!(next in ROLE_RANK)) continue;
    const current = roleByUser.get(row.user_id);
    if (!current || ROLE_RANK[next] > ROLE_RANK[current]) {
      roleByUser.set(row.user_id, next);
    }
  }

  const ids = [...roleByUser.keys()];
  if (ids.length === 0) return [];

  const { data: profiles, error: profileError } = await admin
    .from(MA5_TABLES.profiles)
    .select(
      "id, email, full_name, phone, active, invitation_status, invited_at, invitation_accepted_at, activated_at, last_login_at, access_revoked_at, invite_revoked_at, paused_at, deleted_at, status_before_delete, client_status, admin_notes",
    )
    .eq("tenant_id", ctx.tenantId)
    .in("id", ids)
    .order("full_name", { ascending: true });

  if (profileError) {
    console.error("[members] list profiles", profileError);
    return [];
  }

  return ((profiles ?? []) as ProfileRow[])
    .map((p) => {
      const clientStatus = deriveClientStatusFromLegacy(p);
      return {
        id: p.id,
        fullName: p.full_name?.trim() || p.email,
        email: p.email,
        phone: p.phone ?? "",
        role: roleByUser.get(p.id) ?? "client",
        active: p.active,
        clientStatus,
        invitationStatus: asInvitationStatus(p.invitation_status),
        invitedAt: p.invited_at,
        invitationAcceptedAt: p.invitation_accepted_at,
        activatedAt: p.activated_at,
        lastLoginAt: p.last_login_at,
        accessRevokedAt: p.access_revoked_at,
        inviteRevokedAt: p.invite_revoked_at,
        pausedAt: p.paused_at,
        deletedAt: p.deleted_at,
        statusBeforeDelete: p.status_before_delete
          ? asClientStatus(p.status_before_delete)
          : null,
        notes: p.admin_notes ?? "",
      };
    })
    .filter((member) =>
      options.includeDeleted ? true : member.clientStatus !== "deleted",
    );
}

export function inviteRedirectUrl(siteUrl: string) {
  return `${siteUrl}/auth/callback?next=${encodeURIComponent("/auth/accept-invite")}`;
}
