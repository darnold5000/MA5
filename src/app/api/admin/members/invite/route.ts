import { NextResponse } from "next/server";
import { z } from "zod";

import { inviteRedirectUrl } from "@/features/auth/members";
import { getSessionUser } from "@/lib/auth/session";
import { env, isSupabasePublicConfigured } from "@/lib/env";
import { canAccessAdmin } from "@/lib/permissions/roles";
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
});

function resolveFullName(data: z.infer<typeof inviteSchema>): string {
  if (data.fullName?.trim()) return data.fullName.trim();
  return [data.firstName, data.lastName].filter(Boolean).join(" ").trim();
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

  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (!canAccessAdmin(session.roles)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

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

  try {
    const admin = createServiceClient();

    const { data: existingProfile } = await admin
      .from(MA5_TABLES.profiles)
      .select(
        "id, email, full_name, active, invitation_status, access_revoked_at",
      )
      .ilike("email", emailNorm)
      .maybeSingle();

    if (
      existingProfile &&
      existingProfile.active &&
      existingProfile.invitation_status === "accepted"
    ) {
      await admin.from(MA5_TABLES.userRoles).upsert(
        { user_id: existingProfile.id, role },
        { onConflict: "user_id,role" },
      );
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

    if (inviteError) {
      // Likely already registered — attach role and (re)send recovery/invite status.
      if (existingProfile?.id) {
        await admin.from(MA5_TABLES.profiles).update({
          full_name: fullName,
          phone: parsed.data.phone?.trim() || null,
          admin_notes: parsed.data.notes?.trim() || null,
          invitation_status: "sent",
          invited_at: now,
          active: false,
          access_revoked_at: null,
        }).eq("id", existingProfile.id);

        await admin.from(MA5_TABLES.userRoles).upsert(
          { user_id: existingProfile.id, role },
          { onConflict: "user_id,role" },
        );

        // Existing Auth users cannot receive a second invite email; send a
        // password-setup link instead so they can activate access.
        const userClient = await createClient();
        await userClient.auth.resetPasswordForEmail(emailNorm, {
          redirectTo: inviteRedirectUrl(env.siteUrl),
        });

        return NextResponse.json({
          ok: true,
          member: {
            id: existingProfile.id,
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
      }

      return NextResponse.json(
        { error: inviteError.message },
        { status: 400 },
      );
    }

    const userId = invited.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "Invite created but no user id returned" },
        { status: 500 },
      );
    }

    await admin.from(MA5_TABLES.profiles).upsert(
      {
        id: userId,
        email: emailNorm,
        full_name: fullName,
        phone: parsed.data.phone?.trim() || null,
        admin_notes: parsed.data.notes?.trim() || null,
        active: false,
        invitation_status: "sent",
        invited_at: now,
        access_revoked_at: null,
      },
      { onConflict: "id" },
    );

    await admin.from(MA5_TABLES.userRoles).upsert(
      { user_id: userId, role },
      { onConflict: "user_id,role" },
    );

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
  } catch (err) {
    console.error("[api/admin/members/invite]", err);
    return NextResponse.json(
      { error: "Could not send invitation" },
      { status: 500 },
    );
  }
}
