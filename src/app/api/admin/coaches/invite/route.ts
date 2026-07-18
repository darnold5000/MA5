import { NextResponse } from "next/server";
import { z } from "zod";

import {
  COACHES_COOKIE,
  defaultCoaches,
  parseCoaches,
  serializeCoaches,
} from "@/features/settings/demo-store";
import { inviteRedirectUrl } from "@/features/auth/members";
import { env } from "@/lib/env";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/permissions/roles";
import { isSupabasePublicConfigured } from "@/lib/env";
import {
  createClient,
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

const inviteSchema = z.object({
  fullName: z.string().min(1).max(120),
  email: z.string().email(),
});

function coachesCookieResponse(
  coaches: ReturnType<typeof defaultCoaches>,
  body: unknown,
) {
  const response = NextResponse.json(body);
  response.cookies.set({
    name: COACHES_COOKIE,
    value: serializeCoaches(coaches),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

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

  // Live invite via Supabase Auth Admin
  if (session && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createServiceClient();
      const { data: invited, error: inviteError } =
        await admin.auth.admin.inviteUserByEmail(emailNorm, {
          data: {
            full_name: fullName,
            role: "coach",
            invitation_status: "sent",
            active: false,
          },
          redirectTo: inviteRedirectUrl(env.siteUrl),
        });

      if (inviteError) {
        // User may already exist — try to attach coach role
        const userClient = await createClient();
        const { data: existing } = await userClient
          .from(MA5_TABLES.profiles)
          .select("id, email, full_name")
          .ilike("email", emailNorm)
          .maybeSingle();

        if (existing?.id) {
          await admin.from(MA5_TABLES.userRoles).upsert(
            { user_id: existing.id, role: "coach" },
            { onConflict: "user_id,role" },
          );
          if (fullName && !existing.full_name) {
            await admin
              .from(MA5_TABLES.profiles)
              .update({ full_name: fullName })
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
        await admin.from(MA5_TABLES.profiles).upsert(
          {
            id: userId,
            email: emailNorm,
            full_name: fullName,
            active: false,
            invitation_status: "sent",
            invited_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );
        await admin.from(MA5_TABLES.userRoles).upsert(
          { user_id: userId, role: "coach" },
          { onConflict: "user_id,role" },
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
      // fall through to demo
    }
  }

  // Demo cookie path
  const jar = await import("next/headers").then((m) => m.cookies());
  const cookieStore = await jar;
  const current = parseCoaches(cookieStore.get(COACHES_COOKIE)?.value);
  if (current.some((c) => c.email.toLowerCase() === emailNorm)) {
    return NextResponse.json(
      { error: "That email is already on the coach list" },
      { status: 400 },
    );
  }

  const coach = {
    id: `invited-${Date.now()}`,
    fullName,
    email: emailNorm,
    roleLabel: "Coach",
    status: "invited" as const,
  };
  const next = [...current, coach];
  return coachesCookieResponse(next, {
    ok: true,
    coach,
    message: session
      ? "Invite saved (add SUPABASE_SERVICE_ROLE_KEY to send email)"
      : "Invite saved (demo)",
  });
}
