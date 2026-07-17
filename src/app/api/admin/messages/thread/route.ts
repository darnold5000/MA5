import { NextResponse } from "next/server";
import { z } from "zod";

import {
  COMMUNICATION_COOKIE,
  defaultCommunicationState,
  deliverExternalSafely,
  parseCommunicationState,
  serializeCommunicationState,
} from "@/features/messaging";
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

function senderRoleFromSession(
  roles: readonly string[],
): MessageSenderRole {
  if (roles.includes("admin") || roles.includes("owner")) return "admin";
  if (roles.includes("coach")) return "coach";
  return "coach";
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

  // Demo path
  if (!session) {
    const jar = await import("next/headers").then((m) => m.cookies());
    const cookieStore = await jar;
    const state = parseCommunicationState(
      cookieStore.get(COMMUNICATION_COOKIE)?.value,
      defaultCommunicationState(),
    );

    const client = state.clients.find((c) => c.id === parsed.data.clientId);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const existing = state.threads.find(
      (t) => t.clientId === client.id && t.status === "open",
    );
    if (existing) {
      return NextResponse.json({
        ok: true,
        threadId: existing.id,
        existing: true,
      });
    }

    const now = new Date().toISOString();
    const threadId = `thread-${client.id}-${Date.now()}`;
    const messageId = `msg-${Date.now()}`;
    const role: MessageSenderRole = "coach";
    const message: Message = {
      id: messageId,
      threadId,
      senderUserId: "coach-robert",
      senderName: "Robert Anderson",
      senderRole: role,
      body: parsed.data.body,
      createdAt: now,
      isMine: true,
    };
    const thread: MessageThread = {
      id: threadId,
      clientId: client.id,
      clientName: client.name,
      clientAvatarUrl: client.avatarUrl,
      createdBy: "coach-robert",
      subject: parsed.data.subject ?? null,
      status: "open",
      lastMessageAt: now,
      lastMessagePreview: parsed.data.body,
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
      body: parsed.data.body.slice(0, 120),
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

    void deliverExternalSafely({
      userId: client.id,
      title: notif.title,
      body: notif.body,
      actionUrl: notif.href,
      allowExternal: true,
    });

    return demoResponse(next, { ok: true, threadId });
  }

  try {
    const supabase = await createClient();
    const role = senderRoleFromSession(session.roles);

    const { data: existing } = await supabase
      .from(MA5_TABLES.messageThreads)
      .select("id")
      .eq("client_id", parsed.data.clientId)
      .eq("status", "open")
      .maybeSingle();

    let threadId = existing?.id as string | undefined;
    if (!threadId) {
      const { data: created, error } = await supabase
        .from(MA5_TABLES.messageThreads)
        .insert({
          client_id: parsed.data.clientId,
          created_by: session.id,
          subject: parsed.data.subject ?? null,
          status: "open",
        })
        .select("id")
        .single();
      if (error) throw error;
      threadId = created.id;
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
      .eq("id", parsed.data.clientId)
      .maybeSingle();

    await supabase.from(MA5_TABLES.notifications).insert({
      user_id: parsed.data.clientId,
      type: "direct_message",
      title: `Message from ${session.profile?.full_name ?? "your coach"}`,
      body: parsed.data.body.slice(0, 240),
      href: `/app/messages/${threadId}`,
      entity_type: "thread",
      entity_id: threadId,
    });

    void deliverExternalSafely({
      userId: parsed.data.clientId,
      email: prefs?.email as string | undefined,
      title: "New message from MA5",
      body: parsed.data.body.slice(0, 240),
      actionUrl: `/app/messages/${threadId}`,
      allowExternal: Boolean(prefs?.notify_coach_messages ?? true),
    });

    return NextResponse.json({ ok: true, threadId });
  } catch (err) {
    console.error("[api/admin/messages/thread]", err);
    return NextResponse.json(
      { error: "Could not create thread", warning: "Try demo cookie path" },
      { status: 500 },
    );
  }
}
