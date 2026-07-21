import { NextResponse } from "next/server";
import { z } from "zod";

import {
  COMMUNICATION_COOKIE,
  defaultCommunicationState,
  parseCommunicationState,
  serializeCommunicationState,
} from "@/features/messaging";
import type { CommunicationState } from "@/features/messaging/types";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { hasCapability } from "@/lib/permissions/roles";
import { isDemoEntityId } from "@/features/messaging/resolve-client";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

const schema = z.object({
  messageId: z.string().min(1),
  threadId: z.string().min(1),
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
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const session =
    isSupabasePublicConfigured() && isSupabaseConfigured()
      ? await getSessionUser()
      : null;

  if (session && !hasCapability(session.roles, "message_clients")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!session || isDemoEntityId(parsed.data.messageId)) {
    const jar = await import("next/headers").then((m) => m.cookies());
    const cookieStore = await jar;
    const state = parseCommunicationState(
      cookieStore.get(COMMUNICATION_COOKIE)?.value,
      defaultCommunicationState(),
    );
    const threadMessages = state.messagesByThread[parsed.data.threadId] ?? [];
    const nextMessages = threadMessages.filter(
      (m) => m.id !== parsed.data.messageId,
    );
    const last = nextMessages[nextMessages.length - 1] ?? null;
    const next: CommunicationState = {
      ...state,
      messagesByThread: {
        ...state.messagesByThread,
        [parsed.data.threadId]: nextMessages,
      },
      threads: state.threads.map((t) =>
        t.id === parsed.data.threadId
          ? {
              ...t,
              lastMessageAt: last?.createdAt ?? t.lastMessageAt,
              lastMessagePreview: last?.body ?? null,
              lastSenderRole: last?.senderRole ?? null,
              updatedAt: new Date().toISOString(),
            }
          : t,
      ),
    };
    return demoResponse(next, { ok: true });
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from(MA5_TABLES.messages)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", parsed.data.messageId)
      .eq("thread_id", parsed.data.threadId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/messages/delete]", err);
    return NextResponse.json(
      { error: "Could not delete message" },
      { status: 500 },
    );
  }
}
