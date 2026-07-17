import type { AppNotification, NotificationType } from "@/features/messaging/types";

export type { AppNotification, NotificationType };

export type UnreadCountResponse = {
  count: number;
  label: string;
};
