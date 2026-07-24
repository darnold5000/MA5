import { NextResponse } from "next/server";
import { z } from "zod";

import { nextInviteGeneration } from "@/lib/auth/client-lifecycle";
import { getSessionUser } from "@/lib/auth/session";
import {
  deliverCoachInviteEmail,
  requireAuthEmailStack,
} from "@/lib/email/auth-email-flows";
import {
  findProfileByEmailInTenant,
  inviteUserMetadata,
  upsertInvitedProfile,
  upsertMemberRole,
} from "@/lib/auth/tenant-data";
import { isSupabasePublicConfigured } from "@/lib/env";
import { canAccessAdmin } from "@/lib/permissions/roles";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";
import { isMa5DeploymentConfigured } from "@/lib/tenant/deployment";
import { createMa5TenantServiceClient } from "@/lib/tenant/service";

const inviteSchema = z.object({
  fullName: z.string().min(1).max(120),
  email: z.string().email(),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = inviteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid invite" }, { status: 400 });
  }

  const { fullName, email } = parsed.data;
  const emailNorm = email.trim().toLowerCase();

  const session =
    isSupabasePublicConfigured() && isSupabaseConfigured()
      ? await getSessionUser()
      : null;

  if (session && !canAccessAdmin(session.roles)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  if (session && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    if (!isMa5DeploymentConfigured()) {
      return NextResponse.json(
        {
          error:
            "MA5_TENANT_ID and MA5_LOCATION_ID must be set to invite coaches",
        },
        { status: 503 },
      );
    }

    try {
      const client = createMa5TenantServiceClient();
      const { supabase: admin, ctx } = client;
      const stack = requireAuthEmailStack(ctx.tenantId, admin);

      const existing = await findProfileByEmailInTenant(emailNorm, client);
      const inviteGeneration = nextInviteGeneration(
        existing?.invite_generation ?? null,
      );
      const metadata = inviteUserMetadata(ctx, {
        fullName,
        role: "coach",
        inviteGeneration,
      });

      const { userId } = await deliverCoachInviteEmail({
        stack,
        emailNorm,
        fullName,
        inviteGeneration,
        userMetadata: metadata,
      });

      if (existing?.id && existing.id !== userId) {
        return NextResponse.json(
          { error: "Email is linked to a different account" },
          { status: 400 },
        );
      }

      await upsertInvitedProfile(
        {
          userId,
          emailNorm,
          fullName,
          role: "coach",
          now: new Date().toISOString(),
          inviteGeneration,
        },
        client,
      );

      await upsertMemberRole(userId, "coach", client);

      await admin.auth.admin.updateUserById(userId, {
        user_metadata: { ma5_invite_generation: inviteGeneration },
      });

      if (existing?.id && fullName && !existing.full_name) {
        await admin
          .from(MA5_TABLES.profiles)
          .update({ full_name: fullName })
          .eq("tenant_id", ctx.tenantId)
          .eq("id", userId);
      }

      return NextResponse.json({
        ok: true,
        coach: {
          id: userId,
          fullName,
          email: emailNorm,
          roleLabel: "Coach",
          status: "invited",
        },
        message: "Coach invitation email sent",
      });
    } catch (err) {
      console.error("[api/admin/coaches/invite]", err);
      const message =
        err instanceof Error ? err.message : "Could not send coach invitation";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json(
    {
      error:
        "Coach invitations require Supabase and MA5 deployment configuration",
    },
    { status: 503 },
  );
}
