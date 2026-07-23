import { NextResponse } from "next/server";

import {
  deriveClientStatusFromLegacy,
  normalizeEmail,
  portalStatusMessage,
} from "@/lib/auth/client-lifecycle";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";
import { isMa5DeploymentConfigured } from "@/lib/tenant/deployment";

export type InviteContextResponse =
  | {
      ok: true;
      email: string;
      fullName: string;
      clientStatus: string;
    }
  | {
      ok: false;
      code:
        | "not_configured"
        | "no_session"
        | "no_profile"
        | "email_mismatch"
        | "invite_revoked"
        | "deleted"
        | "paused"
        | "already_active"
        | "invalid_status";
      message: string;
    };

export async function GET(): Promise<NextResponse<InviteContextResponse>> {
  if (!isSupabaseConfigured() || !isMa5DeploymentConfigured()) {
    return NextResponse.json({
      ok: false,
      code: "not_configured",
      message: "Invitations are not configured.",
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return NextResponse.json({
      ok: false,
      code: "no_session",
      message:
        "We could not verify the email associated with this invitation. Please request a new invitation from MA5 Performance.",
    });
  }

  const authEmail = normalizeEmail(user.email);
  const tenantId = process.env.MA5_TENANT_ID?.trim();

  const { data: profile, error: profileError } = await supabase
    .from(MA5_TABLES.profiles)
    .select(
      "id, email, full_name, client_status, invitation_status, invitation_accepted_at, active, access_revoked_at, deleted_at, status_before_delete",
    )
    .eq("id", user.id)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({
      ok: false,
      code: "no_profile",
      message:
        "We could not verify the email associated with this invitation. Please request a new invitation from MA5 Performance.",
    });
  }

  const profileEmail = normalizeEmail(profile.email ?? "");
  if (profileEmail !== authEmail) {
    return NextResponse.json({
      ok: false,
      code: "email_mismatch",
      message:
        "This invitation was issued to a different email address. Sign out and reopen the invitation using the correct account.",
    });
  }

  const clientStatus = deriveClientStatusFromLegacy(profile);

  if (clientStatus === "active") {
    return NextResponse.json({
      ok: false,
      code: "already_active",
      message: "Your account is already active. You can sign in to continue.",
    });
  }

  if (clientStatus !== "invited") {
    return NextResponse.json({
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
    });
  }

  return NextResponse.json({
    ok: true,
    email: authEmail,
    fullName: profile.full_name?.trim() || "",
    clientStatus,
  });
}
