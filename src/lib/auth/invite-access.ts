import { cookies } from "next/headers";

import {
  deriveClientStatusFromLegacy,
  normalizeEmail,
  portalStatusMessage,
} from "@/lib/auth/client-lifecycle";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";
import { isMa5DeploymentConfigured } from "@/lib/tenant/deployment";

export const INVITE_GENERATION_COOKIE = "ma5_invite_gen";

export type InviteAccessFailureCode =
  | "not_configured"
  | "no_session"
  | "no_profile"
  | "email_mismatch"
  | "invite_revoked"
  | "deleted"
  | "paused"
  | "already_active"
  | "invalid_status"
  | "stale_invite";

export type InviteAccessResult =
  | {
      ok: true;
      email: string;
      fullName: string;
      clientStatus: "invited";
      inviteGeneration: number;
    }
  | {
      ok: false;
      code: InviteAccessFailureCode;
      message: string;
    };

function parseInviteGeneration(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : null;
}

export async function resolveInviteAccess(
  linkGeneration?: number | null,
): Promise<InviteAccessResult> {
  if (!isSupabaseConfigured() || !isMa5DeploymentConfigured()) {
    return {
      ok: false,
      code: "not_configured",
      message: "Invitations are not configured.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return {
      ok: false,
      code: "no_session",
      message:
        "We could not verify the email associated with this invitation. Please request a new invitation from MA5 Performance.",
    };
  }

  const authEmail = normalizeEmail(user.email);
  const tenantId = process.env.MA5_TENANT_ID?.trim();

  const { data: profile, error: profileError } = await supabase
    .from(MA5_TABLES.profiles)
    .select(
      "id, email, full_name, client_status, invitation_status, invitation_accepted_at, active, access_revoked_at, deleted_at, status_before_delete, invite_generation",
    )
    .eq("id", user.id)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (profileError || !profile) {
    return {
      ok: false,
      code: "no_profile",
      message:
        "We could not verify the email associated with this invitation. Please request a new invitation from MA5 Performance.",
    };
  }

  const profileEmail = normalizeEmail(profile.email ?? "");
  if (profileEmail !== authEmail) {
    return {
      ok: false,
      code: "email_mismatch",
      message:
        "This invitation was issued to a different email address. Sign out and reopen the invitation using the correct account.",
    };
  }

  const clientStatus = deriveClientStatusFromLegacy(profile);

  if (clientStatus === "active") {
    return {
      ok: false,
      code: "already_active",
      message: "Your account is already active. You can sign in to continue.",
    };
  }

  if (clientStatus !== "invited") {
    return {
      ok: false,
      code:
        clientStatus === "invite_revoked"
          ? "invite_revoked"
          : clientStatus === "deleted"
            ? "deleted"
            : clientStatus === "paused"
              ? "paused"
              : "invalid_status",
      message: portalStatusMessage(clientStatus),
    };
  }

  const profileGeneration = parseInviteGeneration(
    String(profile.invite_generation ?? 1),
  );
  const cookieStore = await cookies();
  const cookieGeneration = parseInviteGeneration(
    cookieStore.get(INVITE_GENERATION_COOKIE)?.value,
  );
  const effectiveGeneration = linkGeneration ?? cookieGeneration;

  if (
    profileGeneration === null ||
    effectiveGeneration === null ||
    effectiveGeneration !== profileGeneration
  ) {
    return {
      ok: false,
      code: "stale_invite",
      message:
        "This invitation link is no longer valid. Ask MA5 Performance to resend your invitation.",
    };
  }

  return {
    ok: true,
    email: authEmail,
    fullName: profile.full_name?.trim() || "",
    clientStatus: "invited",
    inviteGeneration: profileGeneration,
  };
}

export async function stampValidatedInviteGeneration(
  inviteGeneration: number,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(INVITE_GENERATION_COOKIE, String(inviteGeneration), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 30,
  });
}

export async function readValidatedInviteGeneration(): Promise<number | null> {
  const cookieStore = await cookies();
  return parseInviteGeneration(cookieStore.get(INVITE_GENERATION_COOKIE)?.value);
}
