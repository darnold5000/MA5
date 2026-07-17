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
} from "@/features/messaging/types";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { hasCapability } from "@/lib/permissions/roles";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

const schema = z.object({
  threadId: z.string().min(1),
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

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  const session =
    isSupabasePublicConfigured() && isSupabaseConfigured()
      ? await getSessionUser()
      : null;

  if (session && !hasCapability(session.roles, "message_clients")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!session) {
    const jar = await import("next/headers").then((m) => m.cookies());
    const cookieStore = await jar;
    const state = parseCommunicationState(
      cookieStore.get(COMMUNICATION_COOKIE)?.value,
      defaultCommunicationState(),
    );
    const thread = state.threads.find((t) => t.id === parsed.data.threadId);
    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    const now = new Date().toISOString();
    const role: MessageSenderRole = "coach";
    const message: Message = {
      id: `msg-${Date.now()}`,
      threadId: thread.id,
      senderUserId: "coach-robert",
      senderName: "Robert Anderson",
      senderRole: role,
      body: parsed.data.body,
      createdAt: now,
      isMine: true,
    };
    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      type: "direct_message",
      title: "Message from Robert Anderson",
      body: parsed.data.body.slice(0, 120),
      href: `/app/messages/${thread.id}`,
      entityType: "thread",
      entityId: thread.id,
      readAt: null,
      createdAt: now,
    };
    const next: CommunicationState = {
      ...state,
      threads: state.threads.map((t) =>
        t.id === thread.id
          ? {
              ...t,
              lastMessageAt: now,
              lastMessagePreview: parsed.data.body,
              lastSenderRole: role,
              unreadCount: 0,
              updatedAt: now,
            }
          : t,
      ),
      messagesByThread: {
        ...state.messagesByThread,
        [thread.id]: [...(state.messagesByThread[thread.id] ?? []), message],
      },
      notifications: [notif, ...state.notifications],
    };
    void deliverExternalSafely({
      userId: thread.clientId,
      title: notif.title,
      body: notif.body,
      actionUrl: notif.href,
      allowExternal: true,
    });
    return demoResponse(next, { ok: true, messageId: message.id });
  }

  try {
    const supabase = await createClient();
    const role: MessageSenderRole =
      session.roles.includes("admin") || session.roles.includes("owner")
        ? "admin"
        : "coach";

    const { data: thread } = await supabase
      .from(MA5_TABLES.messageThreads)
      .select("id, client_id")
      .eq("id", parsed.data.threadId)
      .maybeSingle();
    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const { data: msg, error } = await supabase
      .from(MA5_TABLES.messages)
      .insert({
        thread_id: parsed.data.threadId,
        sender_user_id: session.id,
        sender_role: role,
        body: parsed.data.body,
      })
      .select("id")
      .single();
    if (error) throw error;

    await supabase.from(MA5_TABLES.messageThreadReads).upsert(
      {
        thread_id: parsed.data.threadId,
        user_id: session.id,
        last_read_at: new Date().toISOString(),
      },
      { onConflict: "thread_id,user_id" },
    );

    const { data: prefs } = await supabase
      .from(MA5_TABLES.profiles)
      .select("notify_coach_messages, email")
      .eq("id", thread.client_id)
      .maybeSingle();

    await supabase.from(MA5_TABLES.notifications).insert({
      user_id: thread.client_id,
      type: "direct_message",
      title: `Message from ${session.profile?.full_name ?? "your coach"}`,
      body: parsed.data.body.slice(0, 240),
      href: `/app/messages/${parsed.data.threadId}`,
      entity_type: "thread",
      entity_id: parsed.data.threadId,
    });

    void deliverExternalSafely({
      userId: String(thread.client_id),
      email: prefs?.email as string | undefined,
      title: "New message from MA5",
      body: parsed.data.body.slice(0, 240),
      actionUrl: `/app/messages/${parsed.data.threadId}`,
      allowExternal: Boolean(prefs?.notify_coach_messages ?? true),
    });

    return NextResponse.json({ ok: true, messageId: msg.id });
  } catch (err) {
    console.error("[api/admin/messages/send]", err);
    return NextResponse.json({ error: "Could not send message" }, { status: 500 });
  }
}
