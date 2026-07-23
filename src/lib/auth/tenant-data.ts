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

export type InvitedProfileInput = {
  userId: string;
  emailNorm: string;
  fullName: string;
  phone?: string;
  notes?: string;
  role: Extract<PlatformRole, "client" | "coach">;
  now: string;
};

type ProfileSummary = {
  id: string;
  email: string;
  full_name: string | null;
  active: boolean;
  invitation_status: string | null;
  access_revoked_at: string | null;
};

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
    .select(
      "id, email, full_name, active, invitation_status, access_revoked_at",
    )
    .eq("tenant_id", ctx.tenantId)
    .ilike("email", emailNorm)
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
      active: false,
      invitation_status: "sent",
      invited_at: input.now,
      access_revoked_at: null,
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

export async function updateMemberAccess(
  memberId: string,
  action: "revoke" | "reactivate",
  client?: Ma5TenantServiceClient,
): Promise<void> {
  const { supabase, ctx } = clientOrCreate(client);
  const now = new Date().toISOString();

  const patch =
    action === "revoke"
      ? {
          active: false,
          invitation_status: "revoked",
          access_revoked_at: now,
        }
      : {
          active: true,
          invitation_status: "accepted",
          access_revoked_at: null,
        };

  const { error } = await supabase
    .from(MA5_TABLES.profiles)
    .update(patch)
    .eq("tenant_id", ctx.tenantId)
    .eq("id", memberId);

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
