/**
 * Server-only: tenant-scoped profile and role writes for Signal Works.
 */

import type { PlatformRole } from "@/lib/permissions/roles";
import { MA5_TABLES } from "@/lib/supabase/tables";
import {
  tenantOnConflict,
  withTenantId,
  type Ma5DeploymentContext,
} from "@/lib/tenant/deployment";
import {
  createMa5TenantServiceClient,
  type Ma5TenantServiceClient,
} from "@/lib/tenant/service";

import {
  applyLifecycleTransition,
  asClientStatus,
  deriveClientStatusFromLegacy,
  patchForActivated,
  patchForInvited,
  type ClientStatus,
  type MemberLifecycleAction,
  type ProfileLifecycleRow,
} from "./client-lifecycle";

export type InvitedProfileInput = {
  userId: string;
  emailNorm: string;
  fullName: string;
  phone?: string;
  notes?: string;
  role: Extract<PlatformRole, "client" | "coach">;
  now: string;
};

type ProfileSummary = ProfileLifecycleRow & {
  id: string;
  email: string;
  full_name: string | null;
};

const PROFILE_SUMMARY_COLS =
  "id, email, full_name, active, invitation_status, invitation_accepted_at, access_revoked_at, client_status, status_before_delete, invite_revoked_at, activated_at, paused_at, deleted_at, invited_at";

function clientOrCreate(
  existing?: Ma5TenantServiceClient,
): Ma5TenantServiceClient {
  return existing ?? createMa5TenantServiceClient();
}

export async function findProfileByEmailInTenant(
  emailNorm: string,
  client?: Ma5TenantServiceClient,
): Promise<ProfileSummary | null> {
  const { supabase, ctx } = clientOrCreate(client);
  const { data, error } = await supabase
    .from(MA5_TABLES.profiles)
    .select(PROFILE_SUMMARY_COLS)
    .eq("tenant_id", ctx.tenantId)
    .ilike("email", emailNorm)
    .maybeSingle();

  if (error) throw error;
  return (data as ProfileSummary | null) ?? null;
}

export async function findProfileByIdInTenant(
  memberId: string,
  client?: Ma5TenantServiceClient,
): Promise<ProfileSummary | null> {
  const { supabase, ctx } = clientOrCreate(client);
  const { data, error } = await supabase
    .from(MA5_TABLES.profiles)
    .select(PROFILE_SUMMARY_COLS)
    .eq("tenant_id", ctx.tenantId)
    .eq("id", memberId)
    .maybeSingle();

  if (error) throw error;
  return (data as ProfileSummary | null) ?? null;
}

export async function upsertInvitedProfile(
  input: InvitedProfileInput,
  client?: Ma5TenantServiceClient,
): Promise<Ma5DeploymentContext> {
  const { supabase, ctx } = clientOrCreate(client);

  const { error: profileError } = await supabase.from(MA5_TABLES.profiles).upsert(
    withTenantId(ctx, {
      id: input.userId,
      email: input.emailNorm,
      full_name: input.fullName,
      phone: input.phone?.trim() || null,
      admin_notes: input.notes?.trim() || null,
      ...patchForInvited(input.now),
    }),
    { onConflict: "id" },
  );
  if (profileError) throw profileError;

  await upsertMemberRole(input.userId, input.role, client);
  return ctx;
}

export async function upsertMemberRole(
  userId: string,
  role: PlatformRole,
  client?: Ma5TenantServiceClient,
): Promise<void> {
  const { supabase, ctx } = clientOrCreate(client);
  const { error } = await supabase.from(MA5_TABLES.userRoles).upsert(
    withTenantId(ctx, { user_id: userId, role }),
    { onConflict: tenantOnConflict(ctx, "user_id,role") },
  );
  if (error) throw error;
}

export async function applyMemberLifecycleAction(
  memberId: string,
  action: MemberLifecycleAction,
  client?: Ma5TenantServiceClient,
): Promise<ClientStatus> {
  const scoped = clientOrCreate(client);
  const { supabase, ctx } = scoped;
  const existing = await findProfileByIdInTenant(memberId, scoped);
  if (!existing) {
    throw new Error("Member not found");
  }

  const currentStatus = deriveClientStatusFromLegacy(existing);
  const now = new Date().toISOString();
  const patch = applyLifecycleTransition(
    { ...existing, client_status: currentStatus },
    action,
    now,
  );

  const { error } = await supabase
    .from(MA5_TABLES.profiles)
    .update(patch)
    .eq("tenant_id", ctx.tenantId)
    .eq("id", memberId);

  if (error) throw error;
  return asClientStatus(patch.client_status as string);
}

/** @deprecated Use applyMemberLifecycleAction */
export async function updateMemberAccess(
  memberId: string,
  action: "revoke" | "reactivate",
  client?: Ma5TenantServiceClient,
): Promise<void> {
  const scoped = clientOrCreate(client);
  const existing = await findProfileByIdInTenant(memberId, scoped);
  if (!existing) throw new Error("Member not found");

  const status = deriveClientStatusFromLegacy(existing);
  const mapped: MemberLifecycleAction =
    action === "revoke"
      ? status === "invited"
        ? "revoke_invite"
        : "pause_access"
      : status === "invite_revoked"
        ? "restore_invitation"
        : "restore_access";

  await applyMemberLifecycleAction(memberId, mapped, scoped);
}

export async function activateMemberProfile(
  userId: string,
  input: { fullName: string; now?: string },
  client?: Ma5TenantServiceClient,
): Promise<void> {
  const { supabase, ctx } = clientOrCreate(client);
  const now = input.now ?? new Date().toISOString();
  const existing = await findProfileByIdInTenant(userId, client);
  if (!existing) {
    throw new Error("No MA5 profile found for this invitation");
  }

  const status = deriveClientStatusFromLegacy(existing);
  if (status === "deleted" || status === "invite_revoked") {
    throw new Error("This invitation is no longer active");
  }
  if (status === "paused") {
    throw new Error("Your account access is paused");
  }
  if (status === "active") {
    return;
  }
  if (status !== "invited") {
    throw new Error("Invitation is not eligible for activation");
  }

  const { error } = await supabase
    .from(MA5_TABLES.profiles)
    .update({
      full_name: input.fullName.trim(),
      ...patchForActivated(now),
    })
    .eq("tenant_id", ctx.tenantId)
    .eq("id", userId)
    .eq("client_status", "invited");

  if (error) throw error;
}

export function inviteUserMetadata(
  ctx: Ma5DeploymentContext,
  input: { fullName: string; role: string },
) {
  return {
    full_name: input.fullName,
    role: input.role,
    invitation_status: "sent",
    active: false,
    ma5_tenant_id: ctx.tenantId,
  };
}
