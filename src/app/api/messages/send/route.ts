import { NextResponse } from "next/server";
import { z } from "zod";

import {
  COMMUNICATION_COOKIE,
  defaultCommunicationState,
  parseCommunicationState,
  serializeCommunicationState,
} from "@/features/messaging";
import type { CommunicationState, Message } from "@/features/messaging/types";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
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
    const message: Message = {
      id: `msg-${Date.now()}`,
      threadId: thread.id,
      senderUserId: "client-alex",
      senderName: "Alex",
      senderRole: "client",
      body: parsed.data.body,
      createdAt: now,
      isMine: true,
    };
    const next: CommunicationState = {
      ...state,
      threads: state.threads.map((t) =>
        t.id === thread.id
          ? {
              ...t,
              lastMessageAt: now,
              lastMessagePreview: parsed.data.body,
              lastSenderRole: "client" as const,
              unreadCount: 1,
              updatedAt: now,
            }
          : t,
      ),
      messagesByThread: {
        ...state.messagesByThread,
        [thread.id]: [
          ...(state.messagesByThread[thread.id] ?? []).map((m) => ({
            ...m,
            isMine: m.senderRole === "client",
          })),
          message,
        ],
      },
      notifications: state.notifications.map((n) =>
        n.entityId === thread.id && n.type === "direct_message"
          ? { ...n, readAt: now }
          : n,
      ),
    };
    return demoResponse(next, { ok: true, messageId: message.id });
  }

  try {
    const supabase = await createClient();
    const { data: thread } = await supabase
      .from(MA5_TABLES.messageThreads)
      .select("id, client_id")
      .eq("id", parsed.data.threadId)
      .maybeSingle();

    if (!thread || thread.client_id !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: msg, error } = await supabase
      .from(MA5_TABLES.messages)
      .insert({
        thread_id: parsed.data.threadId,
        sender_user_id: session.id,
        sender_role: "client",
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

    // Notify staff who can message (best-effort: notify thread creator)
    const { data: threadFull } = await supabase
      .from(MA5_TABLES.messageThreads)
      .select("created_by")
      .eq("id", parsed.data.threadId)
      .maybeSingle();

    if (threadFull?.created_by) {
      await supabase.from(MA5_TABLES.notifications).insert({
        user_id: threadFull.created_by,
        type: "direct_message",
        title: `Reply from ${session.profile?.full_name ?? "client"}`,
        body: parsed.data.body.slice(0, 240),
        href: `/admin/messages/${parsed.data.threadId}`,
        entity_type: "thread",
        entity_id: parsed.data.threadId,
      });
    }

    return NextResponse.json({ ok: true, messageId: msg.id });
  } catch (err) {
    console.error("[api/messages/send]", err);
    return NextResponse.json({ error: "Could not send message" }, { status: 500 });
  }
}
