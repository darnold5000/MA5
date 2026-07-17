import { NextResponse } from "next/server";

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

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Ctx) {
  const { id } = await context.params;
  const now = new Date().toISOString();

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
    const next: CommunicationState = {
      ...state,
      announcements: state.announcements.map((a) =>
        a.id === id
          ? {
              ...a,
              readAt: a.readAt ?? now,
              readCount: a.readAt ? a.readCount : a.readCount + 1,
            }
          : a,
      ),
      notifications: state.notifications.map((n) =>
        n.entityId === id && n.type === "announcement"
          ? { ...n, readAt: n.readAt ?? now }
          : n,
      ),
    };
    return demoResponse(next, { ok: true });
  }

  try {
    const supabase = await createClient();
    await supabase
      .from(MA5_TABLES.announcementRecipients)
      .update({ read_at: now })
      .eq("announcement_id", id)
      .or(`client_id.eq.${session.id},user_id.eq.${session.id}`)
      .is("read_at", null);

    await supabase
      .from(MA5_TABLES.notifications)
      .update({ read_at: now })
      .eq("user_id", session.id)
      .eq("entity_id", id)
      .eq("type", "announcement")
      .is("read_at", null);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/announcements/mark-read]", err);
    return NextResponse.json({ error: "Could not mark read" }, { status: 500 });
  }
}
