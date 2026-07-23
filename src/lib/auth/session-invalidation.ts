import type { Ma5TenantServiceClient } from "@/lib/tenant/service";

/**
 * Best-effort global session invalidation when portal access is removed.
 *
 * Supabase Admin API only signs out via a user JWT, so we cannot always revoke
 * refresh tokens server-side without the user's access token. Middleware and RLS
 * block paused/deleted/revoked users on the very next request even if their JWT
 * has not expired.
 */
export async function invalidateAuthSessionsBestEffort(
  client: Ma5TenantServiceClient,
  userId: string,
): Promise<void> {
  const { supabase } = client;
  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !data.user) return;

    // Bumping invite metadata invalidates stale invite acceptance attempts.
    const currentGen =
      typeof data.user.user_metadata?.ma5_invite_generation === "number"
        ? data.user.user_metadata.ma5_invite_generation
        : 0;

    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...data.user.user_metadata,
        ma5_invite_generation: currentGen,
        ma5_portal_access_revoked_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[auth] invalidateAuthSessionsBestEffort", err);
  }
}
