import { NextResponse } from "next/server";
import { z } from "zod";

import { listMarketingLeads } from "@/features/marketing";
import { updateLeadStatus } from "@/features/marketing/privacy";
import type { LeadStatus } from "@/features/marketing/types";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { canAccessAdmin } from "@/lib/permissions/roles";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { isMa5DeploymentConfigured } from "@/lib/tenant/deployment";
import { createMa5TenantServiceClient } from "@/lib/tenant/service";

const patchSchema = z.object({
  leadId: z.string().uuid(),
  status: z.enum(["new", "contacted", "qualified", "converted", "closed"]),
});

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (!canAccessAdmin(session.roles)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status") as LeadStatus | "all" | null;
  const leads = await listMarketingLeads({
    source: url.searchParams.get("source") ?? undefined,
    campaign: url.searchParams.get("campaign") ?? undefined,
    status: status ?? "all",
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });

  return NextResponse.json({ leads });
}

export async function PATCH(request: Request) {
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
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update" }, { status: 400 });
  }

  const { supabase: admin, ctx } = createMa5TenantServiceClient();
  const result = await updateLeadStatus(
    { admin, tenantId: ctx.tenantId },
    parsed.data.leadId,
    parsed.data.status,
  );

  if (!result.ok) {
    const status = result.error === "Lead not found" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
