import { NextResponse } from "next/server";

import type { Ma5Profile, SessionUser } from "@/lib/auth/session";
import {
  accessStateForClientStatus,
  asClientStatus,
  deriveClientStatusFromLegacy,
  type ClientStatus,
} from "@/lib/auth/client-lifecycle";

export type AccessState = "active" | "pending_invite" | "disabled";

export type ProfileAccessInput = Pick<
  Ma5Profile,
  | "active"
  | "invitation_status"
  | "access_revoked_at"
  | "client_status"
  | "invitation_accepted_at"
  | "deleted_at"
>;

export function resolveClientStatus(
  profile: ProfileAccessInput | null,
): ClientStatus {
  if (!profile) return "active";
  return deriveClientStatusFromLegacy(profile);
}

export function resolveAccessState(profile: ProfileAccessInput | null): AccessState {
  if (!profile) return "active";
  return accessStateForClientStatus(resolveClientStatus(profile));
}

export function isActiveAccess(session: SessionUser): boolean {
  return resolveAccessState(session.profile) === "active";
}

export function accessDeniedResponse(
  access: AccessState,
  clientStatus?: ClientStatus,
): NextResponse {
  if (access === "pending_invite") {
    return NextResponse.json(
      {
        error: "Complete your invitation before using the platform",
        code: "pending_invite",
      },
      { status: 403 },
    );
  }

  const code =
    clientStatus === "paused"
      ? "access_paused"
      : clientStatus === "invite_revoked"
        ? "invite_revoked"
        : clientStatus === "deleted"
          ? "account_deleted"
          : "access_disabled";

  return NextResponse.json(
    {
      error: "Your access has been disabled",
      code,
    },
    { status: 403 },
  );
}

export function accessStateLabel(access: AccessState, status?: ClientStatus): string {
  if (access === "active") return "active";
  if (access === "pending_invite") return "invited";
  return asClientStatus(status);
}
