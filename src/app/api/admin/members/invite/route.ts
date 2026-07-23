import { NextResponse } from "next/server";
import { z } from "zod";

import { inviteRedirectUrl } from "@/features/auth/members";
import { attachLeadOnInvite } from "@/features/marketing/link-lead";
import {
  deriveClientStatusFromLegacy,
  nextInviteGeneration,
} from "@/lib/auth/client-lifecycle";
import { sendExistingUserActivationEmail } from "@/lib/auth/activation-email";
import {
  findProfileByEmailInTenant,
  inviteUserMetadata,
  upsertInvitedProfile,
  upsertMemberRole,
} from "@/lib/auth/tenant-data";
import { requireAdminSessionOrResponse } from "@/lib/auth/session";
import { env, isSupabasePublicConfigured } from "@/lib/env";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { isMa5DeploymentConfigured } from "@/lib/tenant/deployment";
import { createMa5TenantServiceClient } from "@/lib/tenant/service";

const inviteSchema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  fullName: z.string().min(1).max(120).optional(),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  role: z.enum(["client", "coach"]).default("client"),
  notes: z.string().max(2000).optional(),
  resend: z.boolean().optional(),
  leadId: z.string().uuid().optional(),
});

function resolveFullName(data: z.infer<typeof inviteSchema>): string {
  if (data.fullName?.trim()) return data.fullName.trim();
  return [data.firstName, data.lastName].filter(Boolean).join(" ").trim();
}

async function findAuthUserIdByEmail(
  emailNorm: string,
): Promise<string | null> {
  const { supabase: admin } = createMa5TenantServiceClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: emailNorm,
    options: { redirectTo: inviteRedirectUrl(env.siteUrl) },
  });
  if (error) {
    console.error("[api/admin/members/invite] findAuthUser", error.message);
    return null;
  }
  return data.user?.id ?? null;
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = inviteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid invitation" }, { status: 400 });
  }

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
      { error: "SUPABASE_SERVICE_ROLE_KEY is required to send invitations" },
      { status: 503 },
    );
  }

  if (!isMa5DeploymentConfigured()) {
    return NextResponse.json(
      {
        error:
          "MA5_TENANT_ID and MA5_LOCATION_ID must be set for member invitations",
      },
      { status: 503 },
    );
  }

  const emailNorm = parsed.data.email.trim().toLowerCase();
  const fullName = resolveFullName(parsed.data);
  if (!fullName) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const role = parsed.data.role;
  const now = new Date().toISOString();
  const leadIdOpt = parsed.data.leadId ?? null;

  try {
    const client = createMa5TenantServiceClient();
    const { supabase: admin, ctx } = client;

    const existingProfile = await findProfileByEmailInTenant(emailNorm, client);

    const existingStatus = existingProfile
      ? deriveClientStatusFromLegacy(existingProfile)
      : null;

    if (existingProfile && existingStatus === "active") {
      await upsertMemberRole(existingProfile.id, role, client);

      await attachLeadOnInvite({
        client,
        profileId: existingProfile.id,
        email: emailNorm,
        leadId: leadIdOpt,
      });

      return NextResponse.json({
        ok: true,
        member: {
          id: existingProfile.id,
          fullName: fullName || existingProfile.full_name || emailNorm,
          email: emailNorm,
          role,
          invitationStatus: "accepted",
          active: true,
        },
        message: parsed.data.resend
          ? "Member is already active — no new invitation needed"
          : "Existing member already active — role ensured",
      });
    }

    if (
      existingProfile &&
      (existingStatus === "invite_revoked" ||
        existingStatus === "deleted" ||
        existingStatus === "paused")
    ) {
      return NextResponse.json(
        {
          error:
            existingStatus === "invite_revoked"
              ? "Restore the invitation before sending a new invite."
              : existingStatus === "deleted"
                ? "Restore the deleted client before sending a new invite."
                : "Restore client access before sending a new invite.",
        },
        { status: 400 },
      );
    }

    const inviteGeneration = nextInviteGeneration(
      existingProfile?.invite_generation ?? null,
    );

    const { data: invited, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(emailNorm, {
        data: inviteUserMetadata(ctx, { fullName, role, inviteGeneration }),
        redirectTo: inviteRedirectUrl(env.siteUrl, inviteGeneration),
      });

    if (!inviteError) {
      const userId = invited.user?.id;
      if (!userId) {
        return NextResponse.json(
          { error: "Invite created but no user id returned" },
          { status: 500 },
        );
      }

      await upsertInvitedProfile(
        {
          userId,
          emailNorm,
          fullName,
          phone: parsed.data.phone,
          notes: parsed.data.notes,
          role,
          now,
          inviteGeneration,
        },
        client,
      );

      await admin.auth.admin.updateUserById(userId, {
        user_metadata: {
          ma5_invite_generation: inviteGeneration,
        },
      });

      await attachLeadOnInvite({
        client,
        profileId: userId,
        email: emailNorm,
        leadId: leadIdOpt,
      });

      return NextResponse.json({
        ok: true,
        member: {
          id: userId,
          fullName,
          email: emailNorm,
          role,
          invitationStatus: "sent",
          active: false,
        },
        message: "Invitation email sent",
      });
    }

    const existingUserId =
      existingProfile?.id ?? (await findAuthUserIdByEmail(emailNorm));

    if (!existingUserId) {
      return NextResponse.json(
        { error: inviteError.message },
        { status: 400 },
      );
    }

    await upsertInvitedProfile(
      {
        userId: existingUserId,
        emailNorm,
        fullName,
        phone: parsed.data.phone,
        notes: parsed.data.notes,
        role,
        now,
        inviteGeneration,
      },
      client,
    );

    await admin.auth.admin.updateUserById(existingUserId, {
      user_metadata: {
        ma5_invite_generation: inviteGeneration,
      },
    });

    const { channel } = await sendExistingUserActivationEmail({
      admin,
      email: emailNorm,
      fullName,
      inviteGeneration,
    });

    await attachLeadOnInvite({
      client,
      profileId: existingUserId,
      email: emailNorm,
      leadId: leadIdOpt,
    });

    return NextResponse.json({
      ok: true,
      member: {
        id: existingUserId,
        fullName,
        email: emailNorm,
        role,
        invitationStatus: "sent",
        active: false,
      },
      message: parsed.data.resend
        ? channel === "resend"
          ? "Activation email resent"
          : "Invitation resent"
        : channel === "resend"
          ? "Existing account updated — branded activation email sent"
          : "Existing account updated and activation email sent",
    });
  } catch (err) {
    console.error("[api/admin/members/invite]", err);
    return NextResponse.json(
      { error: "Could not send invitation" },
      { status: 500 },
    );
  }
}
