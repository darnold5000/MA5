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
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { isMa5DeploymentConfigured } from "@/lib/tenant/deployment";
import { createMa5TenantServiceClient } from "@/lib/tenant/service";

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

  if (!isMa5DeploymentConfigured()) {
    return NextResponse.json(
      { error: "MA5 tenant deployment is not configured" },
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

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { supabase: admin, ctx } = createMa5TenantServiceClient();
  const scope = { admin, tenantId: ctx.tenantId };

  if (parsed.data.action === "delete_visitor") {
    const result = await deleteAnonymousVisitor(scope, parsed.data.visitorId);
    if (!result.ok) {
      const status = result.error === "Visitor session not found" ? 404 : 409;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "delete_lead") {
    const result = await deleteUnconvertedLead(scope, parsed.data.leadId);
    if (!result.ok) {
      const status = result.error === "Lead not found" ? 404 : 409;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json({ ok: true });
  }

  const deleted = await purgeExpiredAnonymousVisitors(
    scope,
    parsed.data.retentionDays ?? 90,
  );
  return NextResponse.json({ ok: true, deleted });
}
