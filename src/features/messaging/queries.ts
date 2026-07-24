import {
  countStaffUnreadReplies,
  countUnreadNotifications,
  defaultCommunicationState,
} from "@/features/messaging/defaults";
import { loadDemoCommunicationState } from "@/features/messaging/demo-store";
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
import { allowDemoFallbacks, isMa5ProductionRuntime } from "@/lib/tenant/runtime-data";

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

  const threadIds = (threadRows ?? []).map((row) => String(row.id));
  const { data: allMsgRows } =
    threadIds.length > 0
      ? await supabase
          .from(MA5_TABLES.messages)
          .select("*")
          .in("thread_id", threadIds)
          .is("deleted_at", null)
          .order("created_at", { ascending: true })
      : { data: [] as Record<string, unknown>[] };

  const msgsByThread = new Map<string, Record<string, unknown>[]>();
  for (const m of allMsgRows ?? []) {
    const tid = String(m.thread_id);
    const list = msgsByThread.get(tid) ?? [];
    list.push(m as Record<string, unknown>);
    msgsByThread.set(tid, list);
  }

  for (const row of threadRows ?? []) {
    const tid = String(row.id);
    const lastRead = readMap.get(tid);
    let unreadCount = 0;
    const mapped: Message[] = (msgsByThread.get(tid) ?? []).map((m) => {
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

async function loadUnreadBadgeCountFromSupabase(
  viewerId: string,
  isStaff: boolean,
): Promise<number> {
  const supabase = await createClient();

  if (!isStaff) {
    const { count, error } = await supabase
      .from(MA5_TABLES.notifications)
      .select("id", { count: "exact", head: true })
      .eq("user_id", viewerId)
      .is("read_at", null)
      .in("type", ["direct_message", "announcement"]);
    if (error) throw error;
    return count ?? 0;
  }

  const { data: rpcCount, error: rpcError } = await supabase.rpc(
    "ma5_count_staff_unread_messages",
    { p_viewer_id: viewerId },
  );
  if (!rpcError && typeof rpcCount === "number") {
    return rpcCount;
  }

  const { data: threadRows, error: threadErr } = await supabase
    .from(MA5_TABLES.messageThreads)
    .select("id");
  if (threadErr) throw threadErr;

  const threadIds = (threadRows ?? []).map((t) => String(t.id));
  if (threadIds.length === 0) return 0;

  const [{ data: readRows }, { data: msgRows }] = await Promise.all([
    supabase
      .from(MA5_TABLES.messageThreadReads)
      .select("thread_id, last_read_at")
      .eq("user_id", viewerId)
      .in("thread_id", threadIds),
    supabase
      .from(MA5_TABLES.messages)
      .select("thread_id, sender_user_id, sender_role, created_at")
      .in("thread_id", threadIds)
      .is("deleted_at", null),
  ]);

  const readMap = new Map(
    (readRows ?? []).map((r) => [
      r.thread_id as string,
      r.last_read_at as string,
    ]),
  );

  const unreadByThread = new Map<string, number>();
  const lastSenderByThread = new Map<string, Message["senderRole"] | null>();
  const lastMsgAtByThread = new Map<string, string>();

  for (const m of msgRows ?? []) {
    const tid = String(m.thread_id);
    const createdAt = String(m.created_at);
    const senderUserId = String(m.sender_user_id);
    const senderRole = m.sender_role as Message["senderRole"];

    const prevAt = lastMsgAtByThread.get(tid);
    if (!prevAt || createdAt > prevAt) {
      lastMsgAtByThread.set(tid, createdAt);
      lastSenderByThread.set(tid, senderRole);
    }

    if (senderUserId === viewerId) continue;
    const lastRead = readMap.get(tid);
    if (!lastRead || createdAt > lastRead) {
      unreadByThread.set(tid, (unreadByThread.get(tid) ?? 0) + 1);
    }
  }

  let total = 0;
  for (const [tid, unread] of unreadByThread) {
    if (lastSenderByThread.get(tid) === "client" && unread > 0) {
      total += unread;
    }
  }
  return total;
}

export async function loadCommunicationState(): Promise<CommunicationState> {
  const demoAllowed = allowDemoFallbacks();
  const demo = demoAllowed
    ? await loadDemoCommunicationState()
    : defaultCommunicationState();

  if (!isSupabasePublicConfigured() || !isSupabaseConfigured()) {
    if (!demoAllowed) return defaultCommunicationState();
    return demo;
  }

  const session = await getSessionUser();
  if (!session) {
    return defaultCommunicationState();
  }

  try {
    const isStaff =
      canAccessAdmin(session.roles) &&
      hasCapability(session.roles, "message_clients");
    const fromDb = await loadFromSupabase(session.id, isStaff);
    if (fromDb) return fromDb;
    return defaultCommunicationState();
  } catch (err) {
    console.error("[messaging] loadCommunicationState", err);
    if (isMa5ProductionRuntime()) throw err;
    if (!demoAllowed) return defaultCommunicationState();
    return demo;
  }
}

export async function getUnreadBadgeCount(options?: {
  staff?: boolean;
}): Promise<number> {
  if (!isSupabasePublicConfigured() || !isSupabaseConfigured()) {
    return 0;
  }

  const session = await getSessionUser();
  if (!session) return 0;

  const isStaff = Boolean(
    options?.staff &&
      canAccessAdmin(session.roles) &&
      hasCapability(session.roles, "message_clients"),
  );

  try {
    return await loadUnreadBadgeCountFromSupabase(session.id, isStaff);
  } catch (err) {
    console.error("[messaging] getUnreadBadgeCount", err);
    if (isMa5ProductionRuntime()) return 0;
    const state = await loadCommunicationState();
    if (isStaff) {
      return countStaffUnreadReplies(state.threads);
    }
    return countUnreadNotifications(state.notifications);
  }
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
