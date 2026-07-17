import { NextResponse } from "next/server";
import { z } from "zod";

import {
  PROFILE_SETTINGS_COOKIE,
  defaultClientProfile,
  parseClientProfile,
  serializeClientProfile,
} from "@/features/settings/demo-store";
import { DEFAULT_WAIVERS, WAIVER_LABELS } from "@/features/settings/types";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

const patchSchema = z.object({
  fullName: z.string().min(1).max(120).optional(),
  preferredName: z.string().max(80).optional(),
  phone: z.string().max(40).optional(),
  emergencyName: z.string().max(120).optional(),
  emergencyRelationship: z.string().max(80).optional(),
  emergencyPhone: z.string().max(40).optional(),
  emergencyNotes: z.string().max(500).optional(),
  notifyCoachMessages: z.boolean().optional(),
  notifySessionReminders: z.boolean().optional(),
  notifyProgramUpdates: z.boolean().optional(),
  notifyBillingAlerts: z.boolean().optional(),
  avatarUrl: z.string().max(2_000_000).optional(),
  avatarStoragePath: z.string().max(500).optional(),
  signWaiverKey: z
    .enum(["liability", "facility_rules", "media_release"])
    .optional(),
});

function demoCookieResponse(
  profile: ReturnType<typeof defaultClientProfile>,
  body: unknown,
) {
  const response = NextResponse.json(body);
  response.cookies.set({
    name: PROFILE_SETTINGS_COOKIE,
    value: serializeClientProfile(profile),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

export async function PATCH(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid profile data" }, { status: 400 });
  }

  const session =
    isSupabasePublicConfigured() && isSupabaseConfigured()
      ? await getSessionUser()
      : null;

  // Demo / cookie path
  if (!session) {
    const jar = await import("next/headers").then((m) => m.cookies());
    const cookieStore = await jar;
    const current = parseClientProfile(
      cookieStore.get(PROFILE_SETTINGS_COOKIE)?.value,
      defaultClientProfile(),
    );

    const next = { ...current };
    if (parsed.data.fullName !== undefined) next.fullName = parsed.data.fullName;
    if (parsed.data.preferredName !== undefined) {
      next.preferredName = parsed.data.preferredName;
    }
    if (parsed.data.phone !== undefined) next.phone = parsed.data.phone;
    if (parsed.data.emergencyName !== undefined) {
      next.emergencyName = parsed.data.emergencyName;
    }
    if (parsed.data.emergencyRelationship !== undefined) {
      next.emergencyRelationship = parsed.data.emergencyRelationship;
    }
    if (parsed.data.emergencyPhone !== undefined) {
      next.emergencyPhone = parsed.data.emergencyPhone;
    }
    if (parsed.data.emergencyNotes !== undefined) {
      next.emergencyNotes = parsed.data.emergencyNotes;
    }
    if (parsed.data.notifyCoachMessages !== undefined) {
      next.notifyCoachMessages = parsed.data.notifyCoachMessages;
    }
    if (parsed.data.notifySessionReminders !== undefined) {
      next.notifySessionReminders = parsed.data.notifySessionReminders;
    }
    if (parsed.data.notifyProgramUpdates !== undefined) {
      next.notifyProgramUpdates = parsed.data.notifyProgramUpdates;
    }
    if (parsed.data.notifyBillingAlerts !== undefined) {
      next.notifyBillingAlerts = parsed.data.notifyBillingAlerts;
    }
    if (parsed.data.avatarUrl !== undefined) {
      next.avatarUrl = parsed.data.avatarUrl;
    }
    if (parsed.data.signWaiverKey) {
      const key = parsed.data.signWaiverKey;
      next.waivers = next.waivers.map((w) =>
        w.key === key
          ? {
              ...w,
              status: "signed" as const,
              signedAt: new Date().toISOString().slice(0, 10),
              label: WAIVER_LABELS[key],
            }
          : w,
      );
      if (!next.waivers.some((w) => w.key === key)) {
        next.waivers.push({
          key,
          label: WAIVER_LABELS[key],
          status: "signed",
          signedAt: new Date().toISOString().slice(0, 10),
        });
      }
    }

    return demoCookieResponse(next, { ok: true, profile: next });
  }

  try {
    const supabase = await createClient();
    const updates: Record<string, unknown> = {};
    if (parsed.data.fullName !== undefined) {
      updates.full_name = parsed.data.fullName;
    }
    if (parsed.data.preferredName !== undefined) {
      updates.preferred_name = parsed.data.preferredName;
    }
    if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
    if (parsed.data.emergencyName !== undefined) {
      updates.emergency_name = parsed.data.emergencyName;
    }
    if (parsed.data.emergencyRelationship !== undefined) {
      updates.emergency_relationship = parsed.data.emergencyRelationship;
    }
    if (parsed.data.emergencyPhone !== undefined) {
      updates.emergency_phone = parsed.data.emergencyPhone;
    }
    if (parsed.data.emergencyNotes !== undefined) {
      updates.emergency_notes = parsed.data.emergencyNotes;
    }
    if (parsed.data.notifyCoachMessages !== undefined) {
      updates.notify_coach_messages = parsed.data.notifyCoachMessages;
    }
    if (parsed.data.notifySessionReminders !== undefined) {
      updates.notify_session_reminders = parsed.data.notifySessionReminders;
    }
    if (parsed.data.notifyProgramUpdates !== undefined) {
      updates.notify_program_updates = parsed.data.notifyProgramUpdates;
    }
    if (parsed.data.notifyBillingAlerts !== undefined) {
      updates.notify_billing_alerts = parsed.data.notifyBillingAlerts;
    }
    if (parsed.data.avatarStoragePath !== undefined) {
      updates.avatar_url = parsed.data.avatarStoragePath;
    } else if (parsed.data.avatarUrl !== undefined) {
      updates.avatar_url = parsed.data.avatarUrl;
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from(MA5_TABLES.profiles)
        .update(updates)
        .eq("id", session.id);
      if (error) throw error;
    }

    if (parsed.data.signWaiverKey) {
      const key = parsed.data.signWaiverKey;
      const { error } = await supabase.from(MA5_TABLES.clientWaivers).upsert(
        {
          user_id: session.id,
          waiver_key: key,
          status: "signed",
          signed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,waiver_key" },
      );
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/profile]", err);
    // Migration may not be applied — fall back to cookie so demos still save
    const jar = await import("next/headers").then((m) => m.cookies());
    const cookieStore = await jar;
    const current = parseClientProfile(
      cookieStore.get(PROFILE_SETTINGS_COOKIE)?.value,
      defaultClientProfile({
        fullName: session.profile?.full_name ?? undefined,
        email: session.email,
        phone: session.profile?.phone ?? undefined,
      }),
    );
    const next = {
      ...current,
      ...(parsed.data.fullName !== undefined
        ? { fullName: parsed.data.fullName }
        : {}),
      ...(parsed.data.preferredName !== undefined
        ? { preferredName: parsed.data.preferredName }
        : {}),
      ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
      ...(parsed.data.emergencyName !== undefined
        ? { emergencyName: parsed.data.emergencyName }
        : {}),
      ...(parsed.data.emergencyRelationship !== undefined
        ? { emergencyRelationship: parsed.data.emergencyRelationship }
        : {}),
      ...(parsed.data.emergencyPhone !== undefined
        ? { emergencyPhone: parsed.data.emergencyPhone }
        : {}),
      ...(parsed.data.emergencyNotes !== undefined
        ? { emergencyNotes: parsed.data.emergencyNotes }
        : {}),
      ...(parsed.data.notifyCoachMessages !== undefined
        ? { notifyCoachMessages: parsed.data.notifyCoachMessages }
        : {}),
      ...(parsed.data.notifySessionReminders !== undefined
        ? { notifySessionReminders: parsed.data.notifySessionReminders }
        : {}),
      ...(parsed.data.notifyProgramUpdates !== undefined
        ? { notifyProgramUpdates: parsed.data.notifyProgramUpdates }
        : {}),
      ...(parsed.data.notifyBillingAlerts !== undefined
        ? { notifyBillingAlerts: parsed.data.notifyBillingAlerts }
        : {}),
      waivers: parsed.data.signWaiverKey
        ? current.waivers.map((w) =>
            w.key === parsed.data.signWaiverKey
              ? {
                  ...w,
                  status: "signed" as const,
                  signedAt: new Date().toISOString().slice(0, 10),
                }
              : w,
          )
        : current.waivers.length
          ? current.waivers
          : DEFAULT_WAIVERS,
    };
    return demoCookieResponse(next, {
      ok: true,
      profile: next,
      warning: "Saved to demo store (run migration 005 for database persistence)",
    });
  }
}
