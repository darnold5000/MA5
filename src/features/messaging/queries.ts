import {
  countStaffUnreadReplies,
  countUnreadNotifications,
  defaultCommunicationState,
  loadDemoCommunicationState,
} from "@/features/messaging/demo-store";
import { loadMessageableClients } from "@/features/messaging/resolve-client";
import type {
  Announcement,
  AppNotification,
  CommunicationState,
  Message,
  MessageThread,
  ThreadListFilter,
} from "@/features/messaging/types";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { canAccessAdmin, hasCapability } from "@/lib/permissions/roles";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";
import { shouldUseMa5LiveData } from "@/lib/tenant/staging";

function mapThreadRow(
  row: Record<string, unknown>,
  extras: Partial<MessageThread> = {},
): MessageThread {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    clientName: extras.clientName ?? "Client",
    clientAvatarUrl: extras.clientAvatarUrl ?? null,
    createdBy: String(row.created_by),
    subject: (row.subject as string | null) ?? null,
    status: (row.status as MessageThread["status"]) ?? "open",
    lastMessageAt: (row.last_message_at as string | null) ?? null,
    lastMessagePreview: extras.lastMessagePreview ?? null,
    lastSenderRole: extras.lastSenderRole ?? null,
    unreadCount: extras.unreadCount ?? 0,
    membershipLabel: extras.membershipLabel ?? null,
    programLabel: extras.programLabel ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

async function loadFromSupabase(
  viewerId: string,
  isStaff: boolean,
): Promise<CommunicationState | null> {
  const supabase = await createClient();

  const { data: threadRows, error: threadErr } = await supabase
    .from(MA5_TABLES.messageThreads)
    .select("*")
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (threadErr) throw threadErr;
  if (!threadRows?.length && !isStaff) {
    // Empty DB — fall through to demo for local UX unless we have real rows
  }

  const clientIds = [
    ...new Set((threadRows ?? []).map((t) => String(t.client_id))),
  ];
  const { data: profiles } = clientIds.length
    ? await supabase
        .from(MA5_TABLES.profiles)
        .select("id, full_name, avatar_url")
        .in("id", clientIds)
    : { data: [] };

  const profileMap = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      {
        name: (p.full_name as string | null) ?? "Client",
        avatarUrl: (p.avatar_url as string | null) ?? null,
      },
    ]),
  );

  const { data: readRows } = await supabase
    .from(MA5_TABLES.messageThreadReads)
    .select("thread_id, last_read_at")
    .eq("user_id", viewerId);

  const readMap = new Map(
    (readRows ?? []).map((r) => [
      r.thread_id as string,
      r.last_read_at as string,
    ]),
  );

  const threads: MessageThread[] = [];
  const messagesByThread: Record<string, Message[]> = {};

  for (const row of threadRows ?? []) {
    const tid = String(row.id);
    const { data: msgs } = await supabase
      .from(MA5_TABLES.messages)
      .select("*")
      .eq("thread_id", tid)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    const lastRead = readMap.get(tid);
    let unreadCount = 0;
    const mapped: Message[] = (msgs ?? []).map((m) => {
      const createdAt = String(m.created_at);
      const senderUserId = String(m.sender_user_id);
      if (
        senderUserId !== viewerId &&
        (!lastRead || createdAt > lastRead)
      ) {
        unreadCount += 1;
      }
      return {
        id: String(m.id),
        threadId: tid,
        senderUserId,
        senderName:
          senderUserId === viewerId
            ? "You"
            : profileMap.get(String(row.client_id))?.name ?? "Member",
        senderRole: m.sender_role as Message["senderRole"],
        body: String(m.body),
        createdAt,
        isMine: senderUserId === viewerId,
      };
    });

    const last = mapped[mapped.length - 1];
    const profile = profileMap.get(String(row.client_id));
    threads.push(
      mapThreadRow(row as Record<string, unknown>, {
        clientName: profile?.name ?? "Client",
        clientAvatarUrl: profile?.avatarUrl ?? null,
        lastMessagePreview: last?.body ?? null,
        lastSenderRole: last?.senderRole ?? null,
        unreadCount,
      }),
    );
    messagesByThread[tid] = mapped;
  }

  try {
    await supabase.rpc("ma5_expire_announcements");
  } catch {
    /* optional helper — ignore if migration not applied */
  }

  const { data: annRows } = await supabase
    .from(MA5_TABLES.announcements)
    .select("*")
    .order("created_at", { ascending: false });

  const announcements: Announcement[] = [];
  for (const a of annRows ?? []) {
    const { data: recipients } = await supabase
      .from(MA5_TABLES.announcementRecipients)
      .select("client_id, user_id, read_at, delivered_at")
      .eq("announcement_id", a.id);

    const mine = (recipients ?? []).find(
      (r) => r.client_id === viewerId || r.user_id === viewerId,
    );
    if (!isStaff && a.status === "draft") continue;
    if (!isStaff && !mine) continue;

    announcements.push({
      id: String(a.id),
      title: String(a.title),
      body: String(a.body),
      audienceType: a.audience_type as Announcement["audienceType"],
      audienceFilter: (a.audience_filter as Record<string, unknown>) ?? null,
      audienceLabel: audienceLabel(
        a.audience_type as Announcement["audienceType"],
      ),
      priority: a.priority as Announcement["priority"],
      status: a.status as Announcement["status"],
      publishAt: (a.publish_at as string | null) ?? null,
      expiresAt: (a.expires_at as string | null) ?? null,
      linkUrl: (a.link_url as string | null) ?? null,
      createdBy: String(a.created_by),
      createdByName: "Coach",
      deliveredCount: (recipients ?? []).filter((r) => r.delivered_at).length,
      readCount: (recipients ?? []).filter((r) => r.read_at).length,
      createdAt: String(a.created_at),
      updatedAt: String(a.updated_at),
      readAt: (mine?.read_at as string | null) ?? null,
    });
  }

  const { data: notifRows } = await supabase
    .from(MA5_TABLES.notifications)
    .select("*")
    .eq("user_id", viewerId)
    .order("created_at", { ascending: false })
    .limit(50);

  const notifications: AppNotification[] = (notifRows ?? []).map((n) => ({
    id: String(n.id),
    type: (n.type as AppNotification["type"]) ?? "system",
    title: String(n.title),
    body: String(n.body ?? ""),
    href: (n.href as string | null) ?? null,
    entityType: (n.entity_type as string | null) ?? null,
    entityId: (n.entity_id as string | null) ?? null,
    readAt: (n.read_at as string | null) ?? null,
    createdAt: String(n.created_at),
  }));

  // Prefer real DB for staff even when empty (avoid demo client-alex IDs)
  if (
    threads.length === 0 &&
    announcements.length === 0 &&
    notifications.length === 0
  ) {
    if (isStaff) {
      const clients = await loadMessageableClients(supabase);
      return {
        threads: [],
        messagesByThread: {},
        announcements: [],
        notifications: [],
        clients,
      };
    }
    return null;
  }

  let clients = clientIds.map((id) => ({
    id,
    name: profileMap.get(id)?.name ?? "Client",
    avatarUrl: profileMap.get(id)?.avatarUrl ?? null,
    membershipLabel: null as string | null,
    programLabel: null as string | null,
  }));

  if (isStaff) {
    const allClients = await loadMessageableClients(supabase);
    const byId = new Map(clients.map((c) => [c.id, c]));
    for (const c of allClients) {
      if (!byId.has(c.id)) byId.set(c.id, c);
    }
    clients = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  return {
    threads,
    messagesByThread,
    announcements,
    notifications,
    clients,
  };
}

function audienceLabel(type: Announcement["audienceType"]): string {
  switch (type) {
    case "all_active_clients":
      return "All active clients";
    case "team":
      return "Team";
    case "program":
      return "Program";
    case "membership":
      return "Membership group";
    case "selected_clients":
      return "Selected clients";
  }
}

export async function loadCommunicationState(): Promise<CommunicationState> {
  const live = shouldUseMa5LiveData();
  const demo = live ? defaultCommunicationState() : await loadDemoCommunicationState();

  if (!isSupabasePublicConfigured() || !isSupabaseConfigured()) {
    if (live) throw new Error("Messaging requires Supabase on Signal Works deployment");
    return demo;
  }

  const session = await getSessionUser();
  if (!session) {
    if (live) return defaultCommunicationState();
    return demo;
  }

  try {
    const isStaff =
      canAccessAdmin(session.roles) &&
      hasCapability(session.roles, "message_clients");
    const fromDb = await loadFromSupabase(session.id, isStaff);
    if (fromDb) return fromDb;
    if (live) return defaultCommunicationState();
    return demo;
  } catch (err) {
    console.error("[messaging] loadCommunicationState", err);
    if (live) throw err;
    return demo;
  }
}

export async function getUnreadBadgeCount(options?: {
  staff?: boolean;
}): Promise<number> {
  const state = await loadCommunicationState();
  if (options?.staff) {
    return countStaffUnreadReplies(state.threads);
  }
  return countUnreadNotifications(state.notifications);
}

export function filterThreads(
  threads: MessageThread[],
  filter: ThreadListFilter,
): MessageThread[] {
  switch (filter) {
    case "unread":
      return threads.filter((t) => t.unreadCount > 0);
    case "needs_reply":
      return threads.filter(
        (t) => t.lastSenderRole === "client" && t.unreadCount > 0,
      );
    default:
      return threads;
  }
}

export function getThreadMessages(
  state: CommunicationState,
  threadId: string,
): Message[] {
  return state.messagesByThread[threadId] ?? [];
}

export { audienceLabel };
