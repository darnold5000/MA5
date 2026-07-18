import { NextResponse } from "next/server";
import { z } from "zod";

import {
  deleteAnonymousVisitor,
  deleteUnconvertedLead,
  purgeExpiredAnonymousVisitors,
} from "@/features/marketing/privacy";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { canAccessAdmin } from "@/lib/permissions/roles";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("delete_visitor"),
    visitorId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("delete_lead"),
    leadId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("purge_expired"),
    retentionDays: z.number().int().min(1).max(365).optional(),
  }),
]);

/**
 * Admin-safe privacy cleanup for anonymous visitors / unconverted leads.
 * Will not damage active member accounts or converted attribution on profiles.
 */
export async function POST(request: Request) {
  if (!isSupabasePublicConfigured() || !isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 },
    );
  }

  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (!canAccessAdmin(session.roles)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is required" },
      { status: 503 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const admin = createServiceClient();

  if (parsed.data.action === "delete_visitor") {
    const result = await deleteAnonymousVisitor(admin, parsed.data.visitorId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "delete_lead") {
    const result = await deleteUnconvertedLead(admin, parsed.data.leadId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  }

  const deleted = await purgeExpiredAnonymousVisitors(
    admin,
    parsed.data.retentionDays ?? 90,
  );
  return NextResponse.json({ ok: true, deleted });
}
