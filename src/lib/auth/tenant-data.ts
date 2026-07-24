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
  isProfileActivated,
  normalizeEmail,
  patchForActivated,
  patchForInvited,
  patchForReenroll,
  type ClientStatus,
  type MemberLifecycleAction,
  type ProfileLifecycleRow,
} from "./client-lifecycle";
import { invalidateAuthSessionsBestEffort } from "./session-invalidation";

export type InvitedProfileInput = {
  userId: string;
  emailNorm: string;
  fullName: string;
  phone?: string;
  notes?: string;
  role: Extract<PlatformRole, "client" | "coach">;
  now: string;
  inviteGeneration: number;
};

type ProfileSummary = ProfileLifecycleRow & {
  id: string;
  email: string;
  full_name: string | null;
};

const PROFILE_SUMMARY_COLS =
  "id, email, full_name, active, invitation_status, invitation_accepted_at, access_revoked_at, client_status, status_before_delete, invite_revoked_at, activated_at, paused_at, deleted_at, invited_at, invite_generation";

function throwProfileQueryError(error: { message?: string }): never {
  const message = error.message ?? "Profile query failed";
  if (
    message.includes("invite_generation") ||
    message.includes("client_status")
  ) {
    throw new Error(
      "MA5 lifecycle migrations (037–038) are not applied in Supabase. Run them in the SQL editor, then retry.",
    );
  }
  throw new Error(message);
}

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

  if (error) throwProfileQueryError(error);
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

  if (error) throwProfileQueryError(error);
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
      ...patchForInvited(input.now, input.inviteGeneration),
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

export type ReenrollFormerMemberInput = {
  userId: string;
  emailNorm: string;
  fullName: string;
  phone?: string;
  notes?: string;
  role: Extract<PlatformRole, "client" | "coach">;
  inviteGeneration: number;
};

/** Re-open a deleted former member on their existing profile (same email + history). */
export async function reenrollFormerMember(
  input: ReenrollFormerMemberInput,
  client?: Ma5TenantServiceClient,
): Promise<Ma5DeploymentContext> {
  const { supabase, ctx } = clientOrCreate(client);
  const existing = await findProfileByIdInTenant(input.userId, client);
  if (!existing) {
    throw new Error("Former member profile not found");
  }
  if (deriveClientStatusFromLegacy(existing) !== "deleted") {
    throw new Error("Only deleted members can be re-enrolled through this flow");
  }

  const { error: profileError } = await supabase
    .from(MA5_TABLES.profiles)
    .update(
      withTenantId(ctx, {
        email: input.emailNorm,
        full_name: input.fullName,
        phone: input.phone?.trim() || null,
        admin_notes: input.notes?.trim() || null,
        ...patchForReenroll(input.inviteGeneration),
      }),
    )
    .eq("tenant_id", ctx.tenantId)
    .eq("id", input.userId);

  if (profileError) throw profileError;

  await upsertMemberRole(input.userId, input.role, client);
  return ctx;
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

  if (
    action === "pause_access" ||
    action === "delete" ||
    action === "revoke_invite"
  ) {
    await invalidateAuthSessionsBestEffort(scoped, memberId);
  }

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

export type ActivateMemberResult =
  | { outcome: "activated" }
  | { outcome: "already_active" };

export async function activateMemberProfile(
  userId: string,
  input: {
    fullName: string;
    now?: string;
    inviteGeneration: number;
  },
  client?: Ma5TenantServiceClient,
): Promise<ActivateMemberResult> {
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
    return { outcome: "already_active" };
  }
  if (status === "invited" && isProfileActivated(existing)) {
    const { data, error } = await supabase
      .from(MA5_TABLES.profiles)
      .update({
        full_name: input.fullName.trim(),
        ...patchForActivated(now),
      })
      .eq("tenant_id", ctx.tenantId)
      .eq("id", userId)
      .eq("client_status", "invited")
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new Error(
        "This invitation has already been used, was revoked, or is no longer valid.",
      );
    }
    return { outcome: "activated" };
  }
  if (status !== "invited") {
    throw new Error("Invitation is not eligible for activation");
  }

  const { data, error } = await supabase
    .from(MA5_TABLES.profiles)
    .update({
      full_name: input.fullName.trim(),
      ...patchForActivated(now),
    })
    .eq("tenant_id", ctx.tenantId)
    .eq("id", userId)
    .eq("client_status", "invited")
    .eq("invite_generation", input.inviteGeneration)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error(
      "This invitation has already been used, was revoked, or is no longer valid.",
    );
  }

  return { outcome: "activated" };
}

export function inviteUserMetadata(
  ctx: Ma5DeploymentContext,
  input: { fullName: string; role: string; inviteGeneration: number },
) {
  return {
    full_name: input.fullName,
    role: input.role,
    invitation_status: "sent",
    active: false,
    ma5_tenant_id: ctx.tenantId,
    ma5_invite_generation: input.inviteGeneration,
  };
}
