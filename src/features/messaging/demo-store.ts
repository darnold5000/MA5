import type {
  Announcement,
  AppNotification,
  CommunicationState,
  Message,
  MessageThread,
} from "@/features/messaging/types";

export const COMMUNICATION_COOKIE = "ma5_communication";

const COACH_ID = "coach-robert";
const COACH_NAME = "Robert Anderson";
const ALEX_ID = "client-alex";
const JORDAN_ID = "client-jordan";
const EMILY_ID = "client-emily";

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}

function daysAgo(d: number): string {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();
}

export function defaultCommunicationState(): CommunicationState {
  const threadJordan = "thread-jordan";
  const threadAlex = "thread-alex";
  const threadEmily = "thread-emily";

  const jordanMsgs: Message[] = [
    {
      id: "msg-j1",
      threadId: threadJordan,
      senderUserId: COACH_ID,
      senderName: COACH_NAME,
      senderRole: "coach",
      body: "Hey Jordan — noticed you haven’t logged a workout in 6 days. Everything okay? Happy to adjust the plan if life got busy.",
      createdAt: daysAgo(1),
      isMine: false,
    },
    {
      id: "msg-j2",
      threadId: threadJordan,
      senderUserId: JORDAN_ID,
      senderName: "Jordan Lee",
      senderRole: "client",
      body: "Thanks for checking in. Travel week — back Thursday. Can we push the speed sessions to next week?",
      createdAt: hoursAgo(4),
      isMine: false,
    },
  ];

  const alexMsgs: Message[] = [
    {
      id: "msg-a1",
      threadId: threadAlex,
      senderUserId: ALEX_ID,
      senderName: "Alex",
      senderRole: "client",
      body: "Hey — when does my membership renew, and can I pause for a week in August?",
      createdAt: daysAgo(2),
      isMine: true,
    },
    {
      id: "msg-a2",
      threadId: threadAlex,
      senderUserId: COACH_ID,
      senderName: COACH_NAME,
      senderRole: "coach",
      body: "Your plan renews on the 1st. Pausing for a week in August is fine — reply with the dates and I’ll note it.",
      createdAt: daysAgo(1),
      isMine: false,
    },
  ];

  const emilyMsgs: Message[] = [
    {
      id: "msg-e1",
      threadId: threadEmily,
      senderUserId: COACH_ID,
      senderName: COACH_NAME,
      senderRole: "coach",
      body: "Emily — you crushed Strength Foundations. Proud of the consistency. Let’s talk about the next block when you’re ready.",
      createdAt: daysAgo(3),
      isMine: false,
    },
    {
      id: "msg-e2",
      threadId: threadEmily,
      senderUserId: EMILY_ID,
      senderName: "Emily Chen",
      senderRole: "client",
      body: "Thank you! Ready for the next cycle whenever you assign it.",
      createdAt: daysAgo(2),
      isMine: false,
    },
  ];

  const threads: MessageThread[] = [
    {
      id: threadJordan,
      clientId: JORDAN_ID,
      clientName: "Jordan Lee",
      clientAvatarUrl: null,
      createdBy: COACH_ID,
      subject: "Check-in",
      status: "open",
      lastMessageAt: jordanMsgs[1]!.createdAt,
      lastMessagePreview: jordanMsgs[1]!.body,
      lastSenderRole: "client",
      unreadCount: 1,
      membershipLabel: "Unlimited",
      programLabel: "Speed & Power",
      createdAt: daysAgo(1),
      updatedAt: jordanMsgs[1]!.createdAt,
    },
    {
      id: threadAlex,
      clientId: ALEX_ID,
      clientName: "Alex",
      clientAvatarUrl: null,
      createdBy: COACH_ID,
      subject: "Membership",
      status: "open",
      lastMessageAt: alexMsgs[1]!.createdAt,
      lastMessagePreview: alexMsgs[1]!.body,
      lastSenderRole: "coach",
      unreadCount: 1,
      membershipLabel: "14x Membership",
      programLabel: "Strength Foundations",
      createdAt: daysAgo(2),
      updatedAt: alexMsgs[1]!.createdAt,
    },
    {
      id: threadEmily,
      clientId: EMILY_ID,
      clientName: "Emily Chen",
      clientAvatarUrl: null,
      createdBy: COACH_ID,
      subject: "Program complete",
      status: "open",
      lastMessageAt: emilyMsgs[1]!.createdAt,
      lastMessagePreview: emilyMsgs[1]!.body,
      lastSenderRole: "client",
      unreadCount: 0,
      membershipLabel: "Unlimited",
      programLabel: "Strength Foundations (complete)",
      createdAt: daysAgo(3),
      updatedAt: emilyMsgs[1]!.createdAt,
    },
  ];

  const announcements: Announcement[] = [
    {
      id: "ann-holiday",
      title: "Holiday hours",
      body: "MA5 will run modified hours July 4 weekend. Open gym stays 24/7; coaching by appointment Friday–Sunday.",
      audienceType: "all_active_clients",
      audienceFilter: null,
      audienceLabel: "All active clients",
      priority: "important",
      status: "published",
      publishAt: daysAgo(5),
      expiresAt: daysAgo(-10),
      linkUrl: null,
      createdBy: COACH_ID,
      createdByName: COACH_NAME,
      deliveredCount: 42,
      readCount: 28,
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
      readAt: null,
    },
    {
      id: "ann-strength",
      title: "New strength cycle beginning Monday",
      body: "Next programming block starts Monday. Expect heavier compounds and shorter accessory work. Ask your coach if you need regressions.",
      audienceType: "all_active_clients",
      audienceFilter: null,
      audienceLabel: "All active clients",
      priority: "normal",
      status: "published",
      publishAt: daysAgo(2),
      expiresAt: null,
      linkUrl: "/app/programs",
      createdBy: COACH_ID,
      createdByName: COACH_NAME,
      deliveredCount: 42,
      readCount: 11,
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
      readAt: null,
    },
    {
      id: "ann-saturday",
      title: "Saturday class schedule update",
      body: "Saturday small-group slots move to 8:00 AM and 10:00 AM starting this week. Reserve in the app as usual.",
      audienceType: "all_active_clients",
      audienceFilter: null,
      audienceLabel: "All active clients",
      priority: "normal",
      status: "published",
      publishAt: daysAgo(1),
      expiresAt: null,
      linkUrl: "/app/schedule",
      createdBy: COACH_ID,
      createdByName: COACH_NAME,
      deliveredCount: 42,
      readCount: 19,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
      readAt: hoursAgo(12),
    },
  ];

  const notifications: AppNotification[] = [
    {
      id: "notif-dm-alex",
      type: "direct_message",
      title: "Message from Robert Anderson",
      body: alexMsgs[1]!.body.slice(0, 120),
      href: `/app/messages/${threadAlex}`,
      entityType: "thread",
      entityId: threadAlex,
      readAt: null,
      createdAt: alexMsgs[1]!.createdAt,
    },
    {
      id: "notif-ann-strength",
      type: "announcement",
      title: "New strength cycle beginning Monday",
      body: "Next programming block starts Monday.",
      href: "/app/announcements",
      entityType: "announcement",
      entityId: "ann-strength",
      readAt: null,
      createdAt: daysAgo(2),
    },
    {
      id: "notif-ann-saturday",
      type: "announcement",
      title: "Saturday class schedule update",
      body: "Saturday small-group slots move to 8:00 AM and 10:00 AM.",
      href: "/app/announcements",
      entityType: "announcement",
      entityId: "ann-saturday",
      readAt: hoursAgo(12),
      createdAt: daysAgo(1),
    },
  ];

  return {
    threads,
    messagesByThread: {
      [threadJordan]: jordanMsgs,
      [threadAlex]: alexMsgs,
      [threadEmily]: emilyMsgs,
    },
    announcements,
    notifications,
    clients: [
      {
        id: ALEX_ID,
        name: "Alex",
        avatarUrl: null,
        membershipLabel: "14x Membership",
        programLabel: "Strength Foundations",
      },
      {
        id: JORDAN_ID,
        name: "Jordan Lee",
        avatarUrl: null,
        membershipLabel: "Unlimited",
        programLabel: "Speed & Power",
      },
      {
        id: EMILY_ID,
        name: "Emily Chen",
        avatarUrl: null,
        membershipLabel: "Unlimited",
        programLabel: "Strength Foundations (complete)",
      },
    ],
  };
}

export function serializeCommunicationState(state: CommunicationState): string {
  return encodeURIComponent(JSON.stringify(state));
}

export function parseCommunicationState(
  raw: string | undefined,
  fallback: CommunicationState,
): CommunicationState {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as CommunicationState;
    if (!parsed?.threads || !parsed?.announcements) return fallback;
    return {
      ...fallback,
      ...parsed,
      messagesByThread: parsed.messagesByThread ?? fallback.messagesByThread,
      notifications: parsed.notifications ?? fallback.notifications,
      clients: parsed.clients ?? fallback.clients,
    };
  } catch {
    return fallback;
  }
}

export async function loadDemoCommunicationState(): Promise<CommunicationState> {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  return parseCommunicationState(
    jar.get(COMMUNICATION_COOKIE)?.value,
    defaultCommunicationState(),
  );
}

/** Unread badge source of truth for demo: communication notifications only. */
export function countUnreadNotifications(
  notifications: AppNotification[],
): number {
  return notifications.filter(
    (n) =>
      !n.readAt &&
      (n.type === "direct_message" || n.type === "announcement"),
  ).length;
}

export function countStaffUnreadReplies(threads: MessageThread[]): number {
  return threads.reduce((sum, t) => {
    if (t.lastSenderRole === "client" && t.unreadCount > 0) {
      return sum + t.unreadCount;
    }
    return sum;
  }, 0);
}
