import { NextResponse } from "next/server";
import { z } from "zod";

import { applyAttributionToMember } from "@/features/marketing";
import { readAttributionFromCookies } from "@/lib/attribution/cookies";
import {
  resolveInviteAccess,
} from "@/lib/auth/invite-access";
import { activateMemberProfile } from "@/lib/auth/tenant-data";
import {
  canAccessAdmin,
  PLATFORM_ROLES,
  type PlatformRole,
} from "@/lib/permissions/roles";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";
import { isMa5DeploymentConfigured } from "@/lib/tenant/deployment";
import { createMa5TenantServiceClient } from "@/lib/tenant/service";

const bodySchema = z.object({
  password: z.string().min(8).max(128),
  fullName: z.string().min(1).max(120),
  inviteGeneration: z.number().int().min(1),
});

function isPlatformRole(value: string): value is PlatformRole {
  return (PLATFORM_ROLES as readonly string[]).includes(value);
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !isMa5DeploymentConfigured()) {
    return NextResponse.json(
      { error: "Authentication is not configured" },
      { status: 503 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  try {
    const access = await resolveInviteAccess(parsed.data.inviteGeneration);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: 403 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.email) {
      return NextResponse.json(
        { error: "Invitation session expired. Request a new invite." },
        { status: 401 },
      );
    }

    const { error: passwordError } = await supabase.auth.updateUser({
      password: parsed.data.password,
      data: {
        full_name: parsed.data.fullName.trim(),
        invitation_status: "accepted",
        active: true,
      },
    });

    if (passwordError) {
      return NextResponse.json(
        { error: passwordError.message },
        { status: 400 },
      );
    }

    const serviceClient = createMa5TenantServiceClient();
    try {
      await activateMemberProfile(
        user.id,
        {
          fullName: parsed.data.fullName.trim(),
          inviteGeneration: access.inviteGeneration,
        },
        serviceClient,
      );
    } catch (activationError) {
      const message =
        activationError instanceof Error
          ? activationError.message
          : "Could not activate your profile";
      return NextResponse.json({ error: message }, { status: 403 });
    }

    const { data: roleRows } = await supabase
      .from(MA5_TABLES.userRoles)
      .select("role")
      .eq("user_id", user.id);

    const roles = (roleRows ?? [])
      .map((r) => r.role as string)
      .filter(isPlatformRole);

    if (process.env.SUPABASE_SERVICE_ROLE_KEY && user.email) {
      try {
        const { visitorId, firstTouch } = await readAttributionFromCookies();
        await applyAttributionToMember({
          profileId: user.id,
          email: user.email,
          visitorId,
          firstTouch,
        });
      } catch (attrErr) {
        console.error("[api/auth/accept-invite] attribution", attrErr);
      }
    }

    const redirectTo = canAccessAdmin(roles) ? "/admin" : "/app";
    return NextResponse.json({ ok: true, redirectTo });
  } catch (err) {
    console.error("[api/auth/accept-invite]", err);
    return NextResponse.json(
      { error: "Could not activate account" },
      { status: 500 },
    );
  }
}
