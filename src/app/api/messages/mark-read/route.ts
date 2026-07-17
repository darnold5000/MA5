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
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

const schema = z.object({
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
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const session =
    isSupabasePublicConfigured() && isSupabaseConfigured()
      ? await getSessionUser()
      : null;

  const now = new Date().toISOString();

  if (!session) {
    const jar = await import("next/headers").then((m) => m.cookies());
    const cookieStore = await jar;
    const state = parseCommunicationState(
      cookieStore.get(COMMUNICATION_COOKIE)?.value,
      defaultCommunicationState(),
    );
    const next: CommunicationState = {
      ...state,
      threads: state.threads.map((t) =>
        t.id === parsed.data.threadId ? { ...t, unreadCount: 0 } : t,
      ),
      notifications: state.notifications.map((n) =>
        n.entityId === parsed.data.threadId && n.type === "direct_message"
          ? { ...n, readAt: n.readAt ?? now }
          : n,
      ),
    };
    return demoResponse(next, { ok: true });
  }

  try {
    const supabase = await createClient();
    await supabase.from(MA5_TABLES.messageThreadReads).upsert(
      {
        thread_id: parsed.data.threadId,
        user_id: session.id,
        last_read_at: now,
      },
      { onConflict: "thread_id,user_id" },
    );

    await supabase
      .from(MA5_TABLES.notifications)
      .update({ read_at: now })
      .eq("user_id", session.id)
      .eq("entity_id", parsed.data.threadId)
      .eq("type", "direct_message")
      .is("read_at", null);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/messages/mark-read]", err);
    return NextResponse.json({ error: "Could not mark read" }, { status: 500 });
  }
}
