import { NextResponse } from "next/server";
import { z } from "zod";

import { inviteRedirectUrl } from "@/features/auth/members";
import {
  findProfileByEmailInTenant,
  inviteUserMetadata,
  upsertInvitedProfile,
  upsertMemberRole,
} from "@/lib/auth/tenant-data";
import { env, isSupabasePublicConfigured } from "@/lib/env";
import { getSessionUser } from "@/lib/auth/session";
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

      const { data: invited, error: inviteError } =
        await admin.auth.admin.inviteUserByEmail(emailNorm, {
          data: inviteUserMetadata(ctx, { fullName, role: "coach" }),
          redirectTo: inviteRedirectUrl(env.siteUrl),
        });

      if (inviteError) {
        const existing = await findProfileByEmailInTenant(emailNorm, client);

        if (existing?.id) {
          await upsertMemberRole(existing.id, "coach", client);
          if (fullName && !existing.full_name) {
            await admin
              .from(MA5_TABLES.profiles)
              .update({ full_name: fullName })
              .eq("tenant_id", ctx.tenantId)
              .eq("id", existing.id);
          }
          return NextResponse.json({
            ok: true,
            coach: {
              id: existing.id,
              fullName: fullName || existing.full_name || emailNorm,
              email: emailNorm,
              roleLabel: "Coach",
              status: "active",
            },
            message: "Existing account granted coach access",
          });
        }

        return NextResponse.json(
          { error: inviteError.message },
          { status: 400 },
        );
      }

      const userId = invited.user?.id;
      if (userId) {
        await upsertInvitedProfile(
          {
            userId,
            emailNorm,
            fullName,
            role: "coach",
            now: new Date().toISOString(),
          },
          client,
        );
      }

      return NextResponse.json({
        ok: true,
        coach: {
          id: userId ?? `invited-${Date.now()}`,
          fullName,
          email: emailNorm,
          roleLabel: "Coach",
          status: "invited",
        },
        message: "Invite email sent",
      });
    } catch (err) {
      console.error("[api/admin/coaches/invite]", err);
      return NextResponse.json(
        { error: "Could not send coach invitation" },
        { status: 500 },
      );
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
