/** MA5 Communication — domain types (v1). */

export type MessageSenderRole = "coach" | "client" | "admin";
export type ThreadStatus = "open" | "archived";
export type ThreadListFilter = "all" | "unread" | "needs_reply";

export type AnnouncementAudienceType =
  | "all_active_clients"
  | "team"
  | "program"
  | "membership"
  | "selected_clients";

export type AnnouncementPriority = "normal" | "important";
export type AnnouncementStatus = "draft" | "published" | "expired";

export type NotificationType =
  | "direct_message"
  | "announcement"
  | "program_update"
  | "booking_reminder"
  | "billing"
  | "system";

export type MessageThread = {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatarUrl: string | null;
  createdBy: string;
  subject: string | null;
  status: ThreadStatus;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastSenderRole: MessageSenderRole | null;
  unreadCount: number;
  membershipLabel: string | null;
  programLabel: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Message = {
  id: string;
  threadId: string;
  senderUserId: string;
  senderName: string;
  senderRole: MessageSenderRole;
  body: string;
  createdAt: string;
  isMine: boolean;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  audienceType: AnnouncementAudienceType;
  audienceFilter: Record<string, unknown> | null;
  audienceLabel: string;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  publishAt: string | null;
  expiresAt: string | null;
  linkUrl: string | null;
  createdBy: string;
  createdByName: string;
  deliveredCount: number;
  readCount: number;
  createdAt: string;
  updatedAt: string;
  /** Client-facing: whether this user has read it */
  readAt: string | null;
};

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type CommunicationState = {
  threads: MessageThread[];
  messagesByThread: Record<string, Message[]>;
  announcements: Announcement[];
  notifications: AppNotification[];
  /** Demo client ids that map to known personas */
  clients: {
    id: string;
    name: string;
    avatarUrl: string | null;
    membershipLabel: string | null;
    programLabel: string | null;
  }[];
};

export function formatUnreadBadge(count: number): string {
  if (count <= 0) return "";
  if (count > 9) return "9+";
  return String(count);
}
