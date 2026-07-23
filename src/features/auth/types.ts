export type InvitationStatus =
  | "none"
  | "pending"
  | "sent"
  | "accepted"
  | "expired"
  | "revoked"
  | "failed";

import type { ClientStatus } from "@/lib/auth/client-lifecycle";

export type MemberDirectoryRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: "client" | "coach" | "admin" | "staff" | "owner";
  active: boolean;
  clientStatus: ClientStatus;
  invitationStatus: InvitationStatus;
  invitedAt: string | null;
  invitationAcceptedAt: string | null;
  activatedAt: string | null;
  lastLoginAt: string | null;
  accessRevokedAt: string | null;
  inviteRevokedAt: string | null;
  pausedAt: string | null;
  deletedAt: string | null;
  statusBeforeDelete: ClientStatus | null;
  notes: string;
};
