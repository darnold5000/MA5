import { NextResponse } from "next/server";
import { z } from "zod";

import { listDirectoryMembers } from "@/features/auth/members";
import { updateMemberAccess } from "@/lib/auth/tenant-data";
import { requireAdminSessionOrResponse } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { isMa5DeploymentConfigured } from "@/lib/tenant/deployment";

const patchSchema = z.object({
  memberId: z.string().uuid(),
  action: z.enum(["revoke", "reactivate"]),
});

export async function GET() {
  if (!isSupabasePublicConfigured() || !isSupabaseConfigured()) {
    return NextResponse.json({ members: [] });
  }

  const auth = await requireAdminSessionOrResponse();
  if (auth instanceof NextResponse) return auth;

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

  const auth = await requireAdminSessionOrResponse();
  if (auth instanceof NextResponse) return auth;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is required" },
      { status: 503 },
    );
  }

  if (!isMa5DeploymentConfigured()) {
    return NextResponse.json(
      {
        error:
          "MA5_TENANT_ID and MA5_LOCATION_ID must be set to manage members",
      },
      { status: 503 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update" }, { status: 400 });
  }

  if (
    parsed.data.action === "revoke" &&
    parsed.data.memberId === auth.id
  ) {
    return NextResponse.json(
      { error: "You cannot revoke your own access" },
      { status: 400 },
    );
  }

  try {
    await updateMemberAccess(parsed.data.memberId, parsed.data.action);
    return NextResponse.json({
      ok: true,
      status: parsed.data.action === "revoke" ? "revoked" : "active",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
