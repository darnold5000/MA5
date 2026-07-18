export type InvitationStatus =
  | "none"
  | "pending"
  | "sent"
  | "accepted"
  | "expired"
  | "revoked"
  | "failed";

export type MemberDirectoryRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: "client" | "coach" | "admin" | "staff" | "owner";
  active: boolean;
  invitationStatus: InvitationStatus;
  invitedAt: string | null;
  invitationAcceptedAt: string | null;
  lastLoginAt: string | null;
  accessRevokedAt: string | null;
  notes: string;
};
