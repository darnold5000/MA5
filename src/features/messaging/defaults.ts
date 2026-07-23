import type {
  Announcement,
  AppNotification,
  CommunicationState,
  MessageThread,
} from "@/features/messaging/types";

export function defaultCommunicationState(): CommunicationState {
  return {
    threads: [],
    messagesByThread: {},
    announcements: [],
    notifications: [],
    clients: [],
  };
}

export function countStaffUnreadReplies(threads: MessageThread[]): number {
  return threads.reduce((sum, t) => {
    if (t.lastSenderRole === "client" && t.unreadCount > 0) {
      return sum + t.unreadCount;
    }
    return sum;
  }, 0);
}

export function countUnreadNotifications(
  notifications: AppNotification[],
): number {
  return notifications.filter(
    (n) =>
      !n.readAt &&
      (n.type === "direct_message" || n.type === "announcement"),
  ).length;
}

export type { Announcement, AppNotification, CommunicationState };
