import { NextResponse } from "next/server";

import type { Ma5Profile, SessionUser } from "@/lib/auth/session";

export type AccessState = "active" | "pending_invite" | "disabled";

export function resolveAccessState(
  profile: Pick<
    Ma5Profile,
    "active" | "invitation_status" | "access_revoked_at"
  > | null,
): AccessState {
  if (!profile) return "active";
  if (
    profile.invitation_status === "revoked" ||
    Boolean(profile.access_revoked_at)
  ) {
    return "disabled";
  }
  if (
    profile.invitation_status === "sent" ||
    profile.invitation_status === "pending"
  ) {
    return "pending_invite";
  }
  if (profile.active === false) return "disabled";
  return "active";
}

export function isActiveAccess(session: SessionUser): boolean {
  return resolveAccessState(session.profile) === "active";
}

/** JSON 403 for revoked / pending-invite callers on protected APIs. */
export function accessDeniedResponse(access: AccessState): NextResponse {
  if (access === "pending_invite") {
    return NextResponse.json(
      {
        error: "Complete your invitation before using the platform",
        code: "pending_invite",
      },
      { status: 403 },
    );
  }
  return NextResponse.json(
    {
      error: "Your access has been disabled",
      code: "access_disabled",
    },
    { status: 403 },
  );
}
