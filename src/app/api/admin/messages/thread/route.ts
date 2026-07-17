import { NextResponse } from "next/server";
import { z } from "zod";

import {
  COMMUNICATION_COOKIE,
  defaultCommunicationState,
  deliverExternalSafely,
  parseCommunicationState,
  serializeCommunicationState,
} from "@/features/messaging";
import {
  isDemoEntityId,
  resolveClientProfileId,
} from "@/features/messaging/resolve-client";
import type {
  AppNotification,
  CommunicationState,
  Message,
  MessageSenderRole,
  MessageThread,
} from "@/features/messaging/types";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { hasCapability } from "@/lib/permissions/roles";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

const schema = z.object({
  clientId: z.string().min(1),
  subject: z.string().max(200).optional(),
  body: z.string().min(1).max(5000),
});

function demoResponse(state: CommunicationState, body: unknown) {
  const response = NextResponse.json(body);
  response.cookies.set({
    name: COMMUNICATION_COOKIE,
    value: serializeCommunicationState(state),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

function senderRoleFromSession(roles: readonly string[]): MessageSenderRole {
  if (roles.includes("admin") || roles.includes("owner")) return "admin";
  if (roles.includes("coach")) return "coach";
  return "coach";
}

async function handleDemoCreate(
  clientId: string,
  body: string,
  subject?: string,
) {
  const jar = await import("next/headers").then((m) => m.cookies());
  const cookieStore = await jar;
  const state = parseCommunicationState(
    cookieStore.get(COMMUNICATION_COOKIE)?.value,
    defaultCommunicationState(),
  );

  const client = state.clients.find((c) => c.id === clientId);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const existing = state.threads.find(
    (t) => t.clientId === client.id && t.status === "open",
  );
  if (existing) {
    // Append message to existing demo thread
    const now = new Date().toISOString();
    const message: Message = {
      id: `msg-${Date.now()}`,
      threadId: existing.id,
      senderUserId: "coach-robert",
      senderName: "Robert Anderson",
      senderRole: "coach",
      body,
      createdAt: now,
      isMine: true,
    };
    const next: CommunicationState = {
      ...state,
      threads: state.threads.map((t) =>
        t.id === existing.id
          ? {
              ...t,
              lastMessageAt: now,
              lastMessagePreview: body,
              lastSenderRole: "coach" as const,
              unreadCount: 0,
              updatedAt: now,
            }
          : t,
      ),
      messagesByThread: {
        ...state.messagesByThread,
        [existing.id]: [
          ...(state.messagesByThread[existing.id] ?? []),
          message,
        ],
      },
      notifications: [
        {
          id: `notif-${Date.now()}`,
          type: "direct_message" as const,
          title: "Message from Robert Anderson",
          body: body.slice(0, 120),
          href: `/app/messages/${existing.id}`,
          entityType: "thread",
          entityId: existing.id,
          readAt: null,
          createdAt: now,
        },
        ...state.notifications,
      ],
    };
    return demoResponse(next, {
      ok: true,
      threadId: existing.id,
      existing: true,
    });
  }

  const now = new Date().toISOString();
  const threadId = `thread-${client.id}-${Date.now()}`;
  const role: MessageSenderRole = "coach";
  const message: Message = {
    id: `msg-${Date.now()}`,
    threadId,
    senderUserId: "coach-robert",
    senderName: "Robert Anderson",
    senderRole: role,
    body,
    createdAt: now,
    isMine: true,
  };
  const thread: MessageThread = {
    id: threadId,
    clientId: client.id,
    clientName: client.name,
    clientAvatarUrl: client.avatarUrl,
    createdBy: "coach-robert",
    subject: subject ?? null,
    status: "open",
    lastMessageAt: now,
    lastMessagePreview: body,
    lastSenderRole: role,
    unreadCount: 0,
    membershipLabel: client.membershipLabel,
    programLabel: client.programLabel,
    createdAt: now,
    updatedAt: now,
  };
  const notif: AppNotification = {
    id: `notif-${Date.now()}`,
    type: "direct_message",
    title: "Message from Robert Anderson",
    body: body.slice(0, 120),
    href: `/app/messages/${threadId}`,
    entityType: "thread",
    entityId: threadId,
    readAt: null,
    createdAt: now,
  };

  const next: CommunicationState = {
    ...state,
    threads: [thread, ...state.threads],
    messagesByThread: {
      ...state.messagesByThread,
      [threadId]: [message],
    },
    notifications: [notif, ...state.notifications],
  };

  return demoResponse(next, { ok: true, threadId });
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid thread payload" }, { status: 400 });
  }

  const session =
    isSupabasePublicConfigured() && isSupabaseConfigured()
      ? await getSessionUser()
      : null;

  if (session && !hasCapability(session.roles, "message_clients")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!session) {
    return handleDemoCreate(
      parsed.data.clientId,
      parsed.data.body,
      parsed.data.subject,
    );
  }

  try {
    const supabase = await createClient();
    const role = senderRoleFromSession(session.roles);

    const resolved = await resolveClientProfileId(
      supabase,
      parsed.data.clientId,
    );

    // Demo persona with no matching real profile → cookie demo path
    if (!resolved) {
      if (isDemoEntityId(parsed.data.clientId)) {
        return handleDemoCreate(
          parsed.data.clientId,
          parsed.data.body,
          parsed.data.subject,
        );
      }
      return NextResponse.json(
        {
          error:
            "Client not found. Pick a real client account, or ensure Alex is ma5client@example.com in Supabase.",
        },
        { status: 404 },
      );
    }

    const clientUserId = resolved.id;

    const { data: existing } = await supabase
      .from(MA5_TABLES.messageThreads)
      .select("id")
      .eq("client_id", clientUserId)
      .eq("status", "open")
      .maybeSingle();

    let threadId = existing?.id as string | undefined;
    if (!threadId) {
      const { data: created, error } = await supabase
        .from(MA5_TABLES.messageThreads)
        .insert({
          client_id: clientUserId,
          created_by: session.id,
          subject: parsed.data.subject ?? null,
          status: "open",
        })
        .select("id")
        .single();
      if (error) throw error;
      threadId = created.id as string;
    }

    const { error: msgErr } = await supabase.from(MA5_TABLES.messages).insert({
      thread_id: threadId,
      sender_user_id: session.id,
      sender_role: role,
      body: parsed.data.body,
    });
    if (msgErr) throw msgErr;

    await supabase.from(MA5_TABLES.messageThreadReads).upsert(
      {
        thread_id: threadId,
        user_id: session.id,
        last_read_at: new Date().toISOString(),
      },
      { onConflict: "thread_id,user_id" },
    );

    const { data: prefs } = await supabase
      .from(MA5_TABLES.profiles)
      .select("notify_coach_messages, email, full_name")
      .eq("id", clientUserId)
      .maybeSingle();

    await supabase.from(MA5_TABLES.notifications).insert({
      user_id: clientUserId,
      type: "direct_message",
      title: `Message from ${session.profile?.full_name ?? "your coach"}`,
      body: parsed.data.body.slice(0, 240),
      href: `/app/messages/${threadId}`,
      entity_type: "thread",
      entity_id: threadId,
    });

    void deliverExternalSafely({
      userId: clientUserId,
      email: (prefs?.email as string | undefined) ?? resolved.email ?? undefined,
      title: "New message from MA5",
      body: parsed.data.body.slice(0, 240),
      actionUrl: `/app/messages/${threadId}`,
      allowExternal: Boolean(prefs?.notify_coach_messages ?? true),
    });

    return NextResponse.json({
      ok: true,
      threadId,
      existing: Boolean(existing),
    });
  } catch (err) {
    console.error("[api/admin/messages/thread]", err);
    // Tables missing / migration not applied → demo fallback for demo clients
    if (isDemoEntityId(parsed.data.clientId)) {
      return handleDemoCreate(
        parsed.data.clientId,
        parsed.data.body,
        parsed.data.subject,
      );
    }
    return NextResponse.json(
      {
        error:
          "Could not create thread. Confirm migration 007 is applied and the client exists in ma5_profiles.",
      },
      { status: 500 },
    );
  }
}
