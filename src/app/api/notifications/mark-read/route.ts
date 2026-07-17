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
  notificationId: z.string().min(1).optional(),
  all: z.boolean().optional(),
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
      notifications: state.notifications.map((n) => {
        if (parsed.data.all) return { ...n, readAt: n.readAt ?? now };
        if (parsed.data.notificationId && n.id === parsed.data.notificationId) {
          return { ...n, readAt: n.readAt ?? now };
        }
        return n;
      }),
    };
    return demoResponse(next, { ok: true });
  }

  try {
    const supabase = await createClient();
    let query = supabase
      .from(MA5_TABLES.notifications)
      .update({ read_at: now })
      .eq("user_id", session.id)
      .is("read_at", null);

    if (parsed.data.notificationId) {
      query = query.eq("id", parsed.data.notificationId);
    } else if (!parsed.data.all) {
      return NextResponse.json(
        { error: "Provide notificationId or all: true" },
        { status: 400 },
      );
    }

    const { error } = await query;
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/notifications/mark-read]", err);
    return NextResponse.json({ error: "Could not mark read" }, { status: 500 });
  }
}
