import { NextResponse } from "next/server";
import { z } from "zod";

import { listMarketingLeads } from "@/features/marketing";
import type { LeadStatus } from "@/features/marketing/types";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { canAccessAdmin } from "@/lib/permissions/roles";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

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
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update" }, { status: 400 });
  }

  const admin = createServiceClient();
  const { error } = await admin
    .from(MA5_TABLES.leads)
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.leadId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
