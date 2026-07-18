import { NextResponse } from "next/server";
import { z } from "zod";

import { listDirectoryMembers } from "@/features/auth/members";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { canAccessAdmin } from "@/lib/permissions/roles";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

const patchSchema = z.object({
  memberId: z.string().uuid(),
  action: z.enum(["revoke", "reactivate"]),
});

export async function GET() {
  if (!isSupabasePublicConfigured() || !isSupabaseConfigured()) {
    return NextResponse.json({ members: [] });
  }

  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (!canAccessAdmin(session.roles)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const members = await listDirectoryMembers();
  return NextResponse.json({ members });
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
  const now = new Date().toISOString();

  if (parsed.data.action === "revoke") {
    const { error } = await admin
      .from(MA5_TABLES.profiles)
      .update({
        active: false,
        invitation_status: "revoked",
        access_revoked_at: now,
      })
      .eq("id", parsed.data.memberId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, status: "revoked" });
  }

  const { error } = await admin
    .from(MA5_TABLES.profiles)
    .update({
      active: true,
      invitation_status: "accepted",
      access_revoked_at: null,
    })
    .eq("id", parsed.data.memberId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, status: "active" });
}
