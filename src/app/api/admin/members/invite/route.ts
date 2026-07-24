import { NextResponse } from "next/server";
import { z } from "zod";

import { attachLeadOnInvite } from "@/features/marketing/link-lead";
import {
  deriveClientStatusFromLegacy,
  nextInviteGeneration,
  patchForInvited,
} from "@/lib/auth/client-lifecycle";
import { requireAdminSessionOrResponse } from "@/lib/auth/session";
import {
  deliverActiveMemberSignInEmail,
  deliverFormerMemberWelcomeBackEmail,
  deliverMemberActivationResendEmail,
  deliverMemberInviteEmail,
  requireAuthEmailStack,
} from "@/lib/email/auth-email-flows";
import {
  findProfileByEmailInTenant,
  inviteUserMetadata,
  reenrollFormerMember,
  upsertInvitedProfile,
  upsertMemberRole,
} from "@/lib/auth/tenant-data";
import { isSupabasePublicConfigured } from "@/lib/env";
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

function profileWasActivated(profile: {
  invitation_accepted_at?: string | null;
  activated_at?: string | null;
}): boolean {
  return Boolean(profile.invitation_accepted_at || profile.activated_at);
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
    const stack = requireAuthEmailStack(ctx.tenantId, admin);

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

      if (parsed.data.resend) {
        await deliverActiveMemberSignInEmail({
          stack,
          emailNorm,
          fullName: fullName || existingProfile.full_name || emailNorm,
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
          message: "Member is already active — sign-in email sent",
        });
      }

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
        message: "Existing member already active — role ensured",
      });
    }

    if (
      existingProfile &&
      (existingStatus === "invite_revoked" || existingStatus === "paused")
    ) {
      return NextResponse.json(
        {
          error:
            existingStatus === "invite_revoked"
              ? "Restore the invitation before sending a new invite."
              : "Restore client access before sending a new invite.",
        },
        { status: 400 },
      );
    }

    if (existingProfile && existingStatus === "deleted") {
      if (profileWasActivated(existingProfile)) {
        const inviteGeneration = nextInviteGeneration(
          existingProfile.invite_generation ?? null,
        );

        await deliverFormerMemberWelcomeBackEmail({
          stack,
          emailNorm,
          fullName,
        });

        await reenrollFormerMember(
          {
            userId: existingProfile.id,
            emailNorm,
            fullName,
            phone: parsed.data.phone,
            notes: parsed.data.notes,
            role,
            inviteGeneration,
          },
          client,
        );

        await admin.auth.admin.updateUserById(existingProfile.id, {
          user_metadata: {
            ma5_invite_generation: inviteGeneration,
          },
        });

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
            fullName,
            email: emailNorm,
            role,
            invitationStatus: "accepted",
            active: true,
          },
          message:
            "Former member re-enrolled — welcome back email sent. They appear in the directory again.",
        });
      }
    }

    const inviteGeneration = nextInviteGeneration(
      existingProfile?.invite_generation ?? null,
    );
    const metadata = inviteUserMetadata(ctx, {
      fullName,
      role,
      inviteGeneration,
    });

    let userId: string;
    let resendKind: "invite" | "recovery" | "new" = "new";

    if (existingProfile?.id) {
      const profileForEmail = {
        ...existingProfile,
        ...patchForInvited(now, inviteGeneration),
      };
      resendKind = await deliverMemberActivationResendEmail({
        stack,
        emailNorm,
        fullName,
        inviteGeneration,
        profile: profileForEmail,
      });
      userId = existingProfile.id;
    } else {
      const delivered = await deliverMemberInviteEmail({
        stack,
        emailNorm,
        fullName,
        inviteGeneration,
        userMetadata: metadata,
      });
      userId = delivered.userId;
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

    const resentInvite = resendKind === "invite" || resendKind === "new";
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
      message: parsed.data.resend
        ? resentInvite
          ? "Invitation email resent"
          : "Activation email resent"
        : existingProfile
          ? resentInvite
            ? "Existing account updated — invitation email sent"
            : "Existing account updated — activation email sent"
          : "Invitation email sent",
    });
  } catch (err) {
    console.error("[api/admin/members/invite]", err);
    const message =
      err instanceof Error ? err.message : "Could not send invitation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
