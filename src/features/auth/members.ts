import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

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
  last_login_at: string | null;
  access_revoked_at: string | null;
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

export async function listDirectoryMembers(): Promise<MemberDirectoryRow[]> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return [];
  }

  const admin = createServiceClient();
  const { data: roleRows, error: roleError } = await admin
    .from(MA5_TABLES.userRoles)
    .select("user_id, role")
    .in("role", ["client", "coach", "admin", "staff", "owner"]);

  if (roleError) {
    console.error("[members] list roles", roleError);
    return [];
  }

  const roleByUser = new Map<string, MemberDirectoryRow["role"]>();
  for (const row of roleRows ?? []) {
    const current = roleByUser.get(row.user_id);
    const next = row.role as MemberDirectoryRow["role"];
    // Prefer staff-facing role labels over client when multi-role.
    if (!current || current === "client") {
      roleByUser.set(row.user_id, next);
    }
  }

  const ids = [...roleByUser.keys()];
  if (ids.length === 0) return [];

  const { data: profiles, error: profileError } = await admin
    .from(MA5_TABLES.profiles)
    .select(
      "id, email, full_name, phone, active, invitation_status, invited_at, invitation_accepted_at, last_login_at, access_revoked_at, admin_notes",
    )
    .in("id", ids)
    .order("full_name", { ascending: true });

  if (profileError) {
    console.error("[members] list profiles", profileError);
    return [];
  }

  return ((profiles ?? []) as ProfileRow[]).map((p) => ({
    id: p.id,
    fullName: p.full_name?.trim() || p.email,
    email: p.email,
    phone: p.phone ?? "",
    role: roleByUser.get(p.id) ?? "client",
    active: p.active,
    invitationStatus: asInvitationStatus(p.invitation_status),
    invitedAt: p.invited_at,
    invitationAcceptedAt: p.invitation_accepted_at,
    lastLoginAt: p.last_login_at,
    accessRevokedAt: p.access_revoked_at,
    notes: p.admin_notes ?? "",
  }));
}

export function inviteRedirectUrl(siteUrl: string) {
  return `${siteUrl}/auth/callback?next=${encodeURIComponent("/auth/accept-invite")}`;
}
