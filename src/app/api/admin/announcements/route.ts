import { NextResponse } from "next/server";
import { z } from "zod";

import {
  COMMUNICATION_COOKIE,
  audienceLabel,
  defaultCommunicationState,
  parseCommunicationState,
  serializeCommunicationState,
} from "@/features/messaging";
import { publishAnnouncementRecipients } from "@/features/messaging/publish";
import type { Announcement, CommunicationState } from "@/features/messaging/types";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { hasCapability } from "@/lib/permissions/roles";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

const schema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(8000),
  audienceType: z.enum([
    "all_active_clients",
    "team",
    "program",
    "membership",
    "selected_clients",
  ]),
  audienceFilter: z.record(z.string(), z.unknown()).nullable().optional(),
  priority: z.enum(["normal", "important"]).default("normal"),
  linkUrl: z.string().max(2000).nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  publish: z.boolean().optional(),
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
    return NextResponse.json({ error: "Invalid announcement" }, { status: 400 });
  }

  const session =
    isSupabasePublicConfigured() && isSupabaseConfigured()
      ? await getSessionUser()
      : null;

  if (session && !hasCapability(session.roles, "message_clients")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date().toISOString();
  const shouldPublish = Boolean(parsed.data.publish);

  if (!session) {
    const jar = await import("next/headers").then((m) => m.cookies());
    const cookieStore = await jar;
    const state = parseCommunicationState(
      cookieStore.get(COMMUNICATION_COOKIE)?.value,
      defaultCommunicationState(),
    );
    const id = `ann-${Date.now()}`;
    const announcement: Announcement = {
      id,
      title: parsed.data.title,
      body: parsed.data.body,
      audienceType: parsed.data.audienceType,
      audienceFilter: parsed.data.audienceFilter ?? null,
      audienceLabel: audienceLabel(parsed.data.audienceType),
      priority: parsed.data.priority,
      status: shouldPublish ? "published" : "draft",
      publishAt: shouldPublish ? now : null,
      expiresAt: parsed.data.expiresAt ?? null,
      linkUrl: parsed.data.linkUrl || null,
      createdBy: "coach-robert",
      createdByName: "Robert Anderson",
      deliveredCount: shouldPublish ? state.clients.length : 0,
      readCount: 0,
      createdAt: now,
      updatedAt: now,
      readAt: null,
    };

    let notifications = state.notifications;
    if (shouldPublish) {
      notifications = [
        {
          id: `notif-ann-${Date.now()}`,
          type: "announcement" as const,
          title: announcement.title,
          body: announcement.body.slice(0, 120),
          href: "/app/announcements",
          entityType: "announcement",
          entityId: id,
          readAt: null,
          createdAt: now,
        },
        ...notifications,
      ];
    }

    const next: CommunicationState = {
      ...state,
      announcements: [announcement, ...state.announcements],
      notifications,
    };
    return demoResponse(next, {
      ok: true,
      announcementId: id,
      recipientCount: shouldPublish ? state.clients.length : 0,
    });
  }

  try {
    const supabase = await createClient();
    const { data: created, error } = await supabase
      .from(MA5_TABLES.announcements)
      .insert({
        created_by: session.id,
        title: parsed.data.title,
        body: parsed.data.body,
        audience_type: parsed.data.audienceType,
        audience_filter: parsed.data.audienceFilter ?? null,
        priority: parsed.data.priority,
        status: shouldPublish ? "published" : "draft",
        publish_at: shouldPublish ? now : null,
        expires_at: parsed.data.expiresAt ?? null,
        link_url: parsed.data.linkUrl || null,
      })
      .select("id")
      .single();
    if (error) throw error;

    let recipientCount = 0;
    if (shouldPublish) {
      recipientCount = await publishAnnouncementRecipients(
        supabase,
        created.id,
        parsed.data.audienceType,
        parsed.data.audienceFilter ?? null,
        {
          title: parsed.data.title,
          body: parsed.data.body,
        },
      );
    }

    return NextResponse.json({
      ok: true,
      announcementId: created.id,
      recipientCount,
    });
  } catch (err) {
    console.error("[api/admin/announcements]", err);
    return NextResponse.json(
      { error: "Could not save announcement" },
      { status: 500 },
    );
  }
}
