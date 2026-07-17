import { NextResponse } from "next/server";

import {
  COMMUNICATION_COOKIE,
  defaultCommunicationState,
  parseCommunicationState,
  serializeCommunicationState,
} from "@/features/messaging";
import { publishAnnouncementRecipients } from "@/features/messaging/publish";
import type { CommunicationState } from "@/features/messaging/types";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { hasCapability } from "@/lib/permissions/roles";
import {
  createClient,
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
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

  const session =
    isSupabasePublicConfigured() && isSupabaseConfigured()
      ? await getSessionUser()
      : null;

  if (session && !hasCapability(session.roles, "message_clients")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date().toISOString();

  if (!session) {
    const jar = await import("next/headers").then((m) => m.cookies());
    const cookieStore = await jar;
    const state = parseCommunicationState(
      cookieStore.get(COMMUNICATION_COOKIE)?.value,
      defaultCommunicationState(),
    );
    const ann = state.announcements.find((a) => a.id === id);
    if (!ann) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (ann.status === "published") {
      return NextResponse.json({
        ok: true,
        recipientCount: ann.deliveredCount,
        alreadyPublished: true,
      });
    }

    const next: CommunicationState = {
      ...state,
      announcements: state.announcements.map((a) =>
        a.id === id
          ? {
              ...a,
              status: "published" as const,
              publishAt: now,
              deliveredCount: state.clients.length,
              updatedAt: now,
            }
          : a,
      ),
      notifications: [
        {
          id: `notif-ann-${Date.now()}`,
          type: "announcement" as const,
          title: ann.title,
          body: ann.body.slice(0, 120),
          href: "/app/announcements",
          entityType: "announcement",
          entityId: id,
          readAt: null,
          createdAt: now,
        },
        ...state.notifications,
      ],
    };
    return demoResponse(next, {
      ok: true,
      recipientCount: state.clients.length,
    });
  }

  try {
    const supabase = await createClient();
    const { data: ann, error } = await supabase
      .from(MA5_TABLES.announcements)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!ann) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await supabase
      .from(MA5_TABLES.announcements)
      .update({ status: "published", publish_at: now })
      .eq("id", id);

    let db = supabase;
    try {
      db = createServiceClient() as typeof supabase;
    } catch {
      /* fall back to user client + RLS */
    }

    const recipientCount = await publishAnnouncementRecipients(
      db,
      id,
      String(ann.audience_type),
      (ann.audience_filter as Record<string, unknown>) ?? null,
      { title: String(ann.title), body: String(ann.body) },
    );

    return NextResponse.json({ ok: true, recipientCount });
  } catch (err) {
    console.error("[api/admin/announcements/publish]", err);
    return NextResponse.json({ error: "Could not publish" }, { status: 500 });
  }
}
