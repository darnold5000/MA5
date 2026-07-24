/**
 * MA5 client lifecycle — explicit states and legacy field sync.
 *
 * Source of truth: client_status on ma5_profiles.
 * invitation_status, active, and access_revoked_at are kept in sync for RLS/helpers.
 */

export const CLIENT_STATUSES = [
  "invited",
  "active",
  "paused",
  "invite_revoked",
  "deleted",
] as const;

export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const RESTORABLE_CLIENT_STATUSES = [
  "invited",
  "active",
  "paused",
  "invite_revoked",
] as const;

export type RestorableClientStatus = (typeof RESTORABLE_CLIENT_STATUSES)[number];

export type MemberLifecycleAction =
  | "revoke_invite"
  | "restore_invitation"
  | "pause_access"
  | "restore_access"
  | "delete"
  | "restore_deleted";

export type ProfileLifecycleRow = {
  client_status?: string | null;
  status_before_delete?: string | null;
  invitation_status?: string | null;
  invitation_accepted_at?: string | null;
  activated_at?: string | null;
  active?: boolean | null;
  access_revoked_at?: string | null;
  invite_revoked_at?: string | null;
  paused_at?: string | null;
  deleted_at?: string | null;
  invited_at?: string | null;
  invite_generation?: number | null;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function asClientStatus(value: string | null | undefined): ClientStatus {
  if (value && (CLIENT_STATUSES as readonly string[]).includes(value)) {
    return value as ClientStatus;
  }
  return "invited";
}

export function clientStatusLabel(status: ClientStatus): string {
  switch (status) {
    case "invited":
      return "Invited";
    case "active":
      return "Active";
    case "paused":
      return "Paused";
    case "invite_revoked":
      return "Invite revoked";
    case "deleted":
      return "Deleted";
    default:
      return status;
  }
}

/** Map lifecycle state to middleware/API access bucket. */
export function accessStateForClientStatus(
  status: ClientStatus,
): "active" | "pending_invite" | "disabled" {
  switch (status) {
    case "active":
      return "active";
    case "invited":
      return "pending_invite";
    case "paused":
    case "invite_revoked":
    case "deleted":
      return "disabled";
    default:
      return "disabled";
  }
}

export function portalStatusMessage(status: ClientStatus): string {
  switch (status) {
    case "paused":
      return "Your MA5 client portal access is currently paused. Contact MA5 Performance for assistance.";
    case "invited":
      return "Your account setup has not been completed yet. Please use the invitation email sent by MA5 Performance.";
    case "invite_revoked":
      return "This invitation is no longer active. Contact MA5 Performance if you need a new invitation.";
    case "deleted":
      return "This MA5 account is no longer available. Contact MA5 Performance if you believe this is an error.";
    default:
      return "Your MA5 account access is not available. Contact MA5 Performance for assistance.";
  }
}

export function allowedActionsForStatus(status: ClientStatus): MemberLifecycleAction[] {
  switch (status) {
    case "invited":
      return ["revoke_invite", "delete"];
    case "invite_revoked":
      return ["restore_invitation", "delete"];
    case "active":
      return ["pause_access", "delete"];
    case "paused":
      return ["restore_access", "delete"];
    case "deleted":
      return [];
    default:
      return [];
  }
}

/** True when the member still needs the invitation / set-password flow (not forgot-password). */
export function profileNeedsInviteActivationLink(
  profile: ProfileLifecycleRow | null | undefined,
): boolean {
  if (!profile) return true;
  if (profile.invitation_accepted_at || profile.activated_at) return false;
  const status = profile.client_status
    ? asClientStatus(profile.client_status)
    : null;
  if (status === "active" || status === "paused") return false;
  return true;
}

/** True when legacy activation fields indicate the member finished onboarding. */
export function isProfileActivated(
  profile: ProfileLifecycleRow | null | undefined,
): boolean {
  if (!profile) return false;
  if (profile.deleted_at || profile.access_revoked_at) return false;
  if (!profile.invitation_accepted_at && !profile.activated_at) return false;
  return profile.active !== false;
}

export function assertLifecycleAction(
  status: ClientStatus,
  action: MemberLifecycleAction,
): void {
  if (!allowedActionsForStatus(status).includes(action)) {
    throw new Error(`Action "${action}" is not allowed for status "${status}"`);
  }
}

/** Profile patch for a new invitation (create or resend). */
export function patchForInvited(
  now: string,
  inviteGeneration: number,
): Record<string, unknown> {
  return {
    client_status: "invited",
    status_before_delete: null,
    active: false,
    invitation_status: "sent",
    invited_at: now,
    invitation_accepted_at: null,
    activated_at: null,
    access_revoked_at: null,
    invite_revoked_at: null,
    paused_at: null,
    deleted_at: null,
    invite_generation: inviteGeneration,
  };
}

export function nextInviteGeneration(current: number | null | undefined): number {
  const base = typeof current === "number" && current >= 1 ? current : 0;
  return base + 1;
}

/**
 * Bring a former member back on the same profile + auth user.
 * Preserves activation history; clears deleted/pause/revoke flags.
 */
export function patchForReenroll(
  inviteGeneration: number,
): Record<string, unknown> {
  return {
    client_status: "active",
    status_before_delete: null,
    active: true,
    invitation_status: "accepted",
    access_revoked_at: null,
    invite_revoked_at: null,
    paused_at: null,
    deleted_at: null,
    invite_generation: inviteGeneration,
  };
}

/** Profile patch after genuine account activation. */
export function patchForActivated(now: string): Record<string, unknown> {
  return {
    client_status: "active",
    status_before_delete: null,
    active: true,
    invitation_status: "accepted",
    invitation_accepted_at: now,
    activated_at: now,
    access_revoked_at: null,
    invite_revoked_at: null,
    paused_at: null,
    deleted_at: null,
  };
}

export function applyLifecycleTransition(
  current: ProfileLifecycleRow,
  action: MemberLifecycleAction,
  now: string,
): Record<string, unknown> {
  const status = asClientStatus(current.client_status);
  assertLifecycleAction(status, action);

  switch (action) {
    case "revoke_invite":
      return {
        client_status: "invite_revoked",
        active: false,
        invitation_status: "revoked",
        access_revoked_at: now,
        invite_revoked_at: now,
        paused_at: null,
        deleted_at: null,
        status_before_delete: null,
      };
    case "restore_invitation":
      return patchForInvited(now, current.invite_generation ?? 1);
    case "pause_access":
      return {
        client_status: "paused",
        active: false,
        invitation_status: "accepted",
        access_revoked_at: now,
        paused_at: now,
        invite_revoked_at: null,
        deleted_at: null,
        status_before_delete: null,
      };
    case "restore_access":
      return {
        client_status: "active",
        active: true,
        invitation_status: "accepted",
        access_revoked_at: null,
        invite_revoked_at: null,
        paused_at: null,
        deleted_at: null,
        status_before_delete: null,
      };
    case "delete": {
      const prior = status === "deleted" ? current.status_before_delete : status;
      return {
        client_status: "deleted",
        status_before_delete: prior ?? status,
        active: false,
        access_revoked_at: now,
        deleted_at: now,
      };
    }
    case "restore_deleted": {
      const restored = asClientStatus(
        current.status_before_delete ?? "invited",
      ) as RestorableClientStatus;
      if (restored === "active") {
        return {
          client_status: "active",
          status_before_delete: null,
          active: true,
          invitation_status: "accepted",
          access_revoked_at: null,
          invite_revoked_at: null,
          paused_at: null,
          deleted_at: null,
        };
      }
      if (restored === "paused") {
        return {
          client_status: "paused",
          status_before_delete: null,
          active: false,
          invitation_status: "accepted",
          access_revoked_at: now,
          paused_at: current.paused_at ?? now,
          invite_revoked_at: null,
          deleted_at: null,
        };
      }
      if (restored === "invite_revoked") {
        return {
          client_status: "invite_revoked",
          status_before_delete: null,
          active: false,
          invitation_status: "revoked",
          access_revoked_at: current.invite_revoked_at ?? now,
          invite_revoked_at: current.invite_revoked_at ?? now,
          paused_at: null,
          deleted_at: null,
        };
      }
      return patchForInvited(now, current.invite_generation ?? 1);
    }
    default:
      throw new Error("Unsupported lifecycle action");
  }
}

/** Infer lifecycle status from legacy columns (for reads before migration 037). */
export function deriveClientStatusFromLegacy(
  profile: ProfileLifecycleRow,
): ClientStatus {
  if (profile.client_status) {
    const status = asClientStatus(profile.client_status);
    if (status === "invited" && isProfileActivated(profile)) {
      return "active";
    }
    return status;
  }
  if (profile.deleted_at) return "deleted";
  if (
    profile.invitation_accepted_at &&
    profile.active &&
    !profile.access_revoked_at &&
    profile.invitation_status === "accepted"
  ) {
    return "active";
  }
  if (profile.invitation_accepted_at && (!profile.active || profile.access_revoked_at)) {
    return "paused";
  }
  if (profile.invitation_status === "revoked" && !profile.invitation_accepted_at) {
    return "invite_revoked";
  }
  if (
    profile.invitation_status === "sent" ||
    profile.invitation_status === "pending" ||
    profile.invitation_status === "expired" ||
    profile.invitation_status === "failed"
  ) {
    return "invited";
  }
  if (profile.invitation_accepted_at) return "active";
  return "invited";
}
