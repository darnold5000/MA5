import { NextResponse } from "next/server";
import { z } from "zod";

import { inviteRedirectUrl } from "@/features/auth/members";
import { attachLeadOnInvite } from "@/features/marketing/link-lead";
import { requireAdminSessionOrResponse } from "@/lib/auth/session";
import { env, isSupabasePublicConfigured } from "@/lib/env";
import {
  createClient,
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

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

async function sendActivationEmail(emailNorm: string) {
  const userClient = await createClient();
  const { error } = await userClient.auth.resetPasswordForEmail(emailNorm, {
    redirectTo: inviteRedirectUrl(env.siteUrl),
  });
  if (error) {
    console.error("[api/admin/members/invite] activation email", error.message);
  }
}

/**
 * Resolve an Auth user that already exists but may lack a ma5_profiles row.
 * generateLink does not send email; it returns the user id for linking.
 */
async function findAuthUserIdByEmail(
  admin: ReturnType<typeof createServiceClient>,
  emailNorm: string,
): Promise<string | null> {
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: emailNorm,
  });
  if (error) {
    console.error("[api/admin/members/invite] findAuthUser", error.message);
    return null;
  }
  return data.user?.id ?? null;
}

async function upsertInvitedProfile(
  admin: ReturnType<typeof createServiceClient>,
  args: {
    userId: string;
    emailNorm: string;
    fullName: string;
    phone?: string;
    notes?: string;
    role: "client" | "coach";
    now: string;
    leadId: string | null;
  },
) {
  await admin.from(MA5_TABLES.profiles).upsert(
    {
      id: args.userId,
      email: args.emailNorm,
      full_name: args.fullName,
      phone: args.phone?.trim() || null,
      admin_notes: args.notes?.trim() || null,
      active: false,
      invitation_status: "sent",
      invited_at: args.now,
      access_revoked_at: null,
    },
    { onConflict: "id" },
  );

  await admin.from(MA5_TABLES.userRoles).upsert(
    { user_id: args.userId, role: args.role },
    { onConflict: "user_id,role" },
  );

  await attachLeadOnInvite({
    admin,
    profileId: args.userId,
    email: args.emailNorm,
    leadId: args.leadId,
  });
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

  const emailNorm = parsed.data.email.trim().toLowerCase();
  const fullName = resolveFullName(parsed.data);
  if (!fullName) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const role = parsed.data.role;
  const now = new Date().toISOString();
  const leadIdOpt = parsed.data.leadId ?? null;

  try {
    const admin = createServiceClient();

    const { data: existingProfile } = await admin
      .from(MA5_TABLES.profiles)
      .select(
        "id, email, full_name, active, invitation_status, access_revoked_at",
      )
      .ilike("email", emailNorm)
      .maybeSingle();

    // Case A: already active member — ensure role, do not re-invite.
    if (
      existingProfile &&
      existingProfile.active &&
      existingProfile.invitation_status === "accepted"
    ) {
      await admin.from(MA5_TABLES.userRoles).upsert(
        { user_id: existingProfile.id, role },
        { onConflict: "user_id,role" },
      );

      await attachLeadOnInvite({
        admin,
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

    // Case B: brand-new Auth user via invite email.
    const { data: invited, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(emailNorm, {
        data: {
          full_name: fullName,
          role,
          invitation_status: "sent",
          active: false,
        },
        redirectTo: inviteRedirectUrl(env.siteUrl),
      });

    if (!inviteError) {
      const userId = invited.user?.id;
      if (!userId) {
        return NextResponse.json(
          { error: "Invite created but no user id returned" },
          { status: 500 },
        );
      }

      await upsertInvitedProfile(admin, {
        userId,
        emailNorm,
        fullName,
        phone: parsed.data.phone,
        notes: parsed.data.notes,
        role,
        now,
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

    // Case C: Auth user already exists (with or without a profile).
    // inviteUserByEmail fails when "Enable sign ups" is off OR user exists —
    // admin inviteUserByEmail should still work with signups disabled; the
    // usual failure here is "already registered".
    const existingUserId =
      existingProfile?.id ?? (await findAuthUserIdByEmail(admin, emailNorm));

    if (!existingUserId) {
      return NextResponse.json(
        { error: inviteError.message },
        { status: 400 },
      );
    }

    await upsertInvitedProfile(admin, {
      userId: existingUserId,
      emailNorm,
      fullName,
      phone: parsed.data.phone,
      notes: parsed.data.notes,
      role,
      now,
      leadId: leadIdOpt,
    });

    // Existing Auth users cannot receive a second invite email; send a
    // password-setup link that lands on /auth/callback → /auth/accept-invite.
    await sendActivationEmail(emailNorm);

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
        ? "Invitation resent"
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
