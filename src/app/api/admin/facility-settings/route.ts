import { NextResponse } from "next/server";
import { z } from "zod";

import {
  FACILITY_SETTINGS_COOKIE,
  defaultFacilitySettings,
  parseFacilitySettings,
  serializeFacilitySettings,
} from "@/features/settings/demo-store";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/permissions/roles";
import { isSupabasePublicConfigured } from "@/lib/env";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

const patchSchema = z.object({
  gymName: z.string().min(1).max(120).optional(),
  legalName: z.string().min(1).max(160).optional(),
  addressLine: z.string().min(1).max(240).optional(),
  email: z.string().email().optional(),
  openGymHours: z.string().max(160).optional(),
  coachingHours: z.string().max(160).optional(),
  hoursSummary: z.string().max(320).optional(),
  brandPrimary: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  logoStoragePath: z.string().max(2_000_000).optional(),
  notifyFailedPayments: z.boolean().optional(),
  notifyNewSignups: z.boolean().optional(),
  notifyMessageDigest: z.boolean().optional(),
  notifyCapacityWarnings: z.boolean().optional(),
});

function cookieResponse(
  settings: ReturnType<typeof defaultFacilitySettings>,
  body: unknown,
) {
  const response = NextResponse.json(body);
  response.cookies.set({
    name: FACILITY_SETTINGS_COOKIE,
    value: serializeFacilitySettings(settings),
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
    return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
  }

  const session =
    isSupabasePublicConfigured() && isSupabaseConfigured()
      ? await getSessionUser()
      : null;

  if (session && !canAccessAdmin(session.roles)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  if (!session) {
    const jar = await import("next/headers").then((m) => m.cookies());
    const cookieStore = await jar;
    const current = parseFacilitySettings(
      cookieStore.get(FACILITY_SETTINGS_COOKIE)?.value,
    );
    const next = { ...current, ...parsed.data };
    // Never stuff large data URLs into the cookie
    if (next.logoStoragePath?.startsWith("data:")) {
      next.logoStoragePath = "local:logo";
      next.logoUrl = null;
    } else if (next.logoStoragePath === "local:logo") {
      next.logoUrl = null;
    } else if (next.logoStoragePath) {
      next.logoUrl = next.logoStoragePath.startsWith("http")
        ? next.logoStoragePath
        : next.logoUrl;
    }
    return cookieResponse(next, { ok: true, settings: next });
  }

  try {
    const supabase = await createClient();
    const updates: Record<string, unknown> = {};
    if (parsed.data.gymName !== undefined) updates.gym_name = parsed.data.gymName;
    if (parsed.data.legalName !== undefined) {
      updates.legal_name = parsed.data.legalName;
    }
    if (parsed.data.addressLine !== undefined) {
      updates.address_line = parsed.data.addressLine;
    }
    if (parsed.data.email !== undefined) updates.email = parsed.data.email;
    if (parsed.data.openGymHours !== undefined) {
      updates.open_gym_hours = parsed.data.openGymHours;
    }
    if (parsed.data.coachingHours !== undefined) {
      updates.coaching_hours = parsed.data.coachingHours;
    }
    if (parsed.data.hoursSummary !== undefined) {
      updates.hours_summary = parsed.data.hoursSummary;
    }
    if (parsed.data.brandPrimary !== undefined) {
      updates.brand_primary = parsed.data.brandPrimary;
    }
    if (parsed.data.logoStoragePath !== undefined) {
      updates.logo_storage_path = parsed.data.logoStoragePath;
    }
    if (parsed.data.notifyFailedPayments !== undefined) {
      updates.notify_failed_payments = parsed.data.notifyFailedPayments;
    }
    if (parsed.data.notifyNewSignups !== undefined) {
      updates.notify_new_signups = parsed.data.notifyNewSignups;
    }
    if (parsed.data.notifyMessageDigest !== undefined) {
      updates.notify_message_digest = parsed.data.notifyMessageDigest;
    }
    if (parsed.data.notifyCapacityWarnings !== undefined) {
      updates.notify_capacity_warnings = parsed.data.notifyCapacityWarnings;
    }

    const { error } = await supabase
      .from(MA5_TABLES.facilitySettings)
      .update(updates)
      .eq("id", 1);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/facility-settings]", err);
    const jar = await import("next/headers").then((m) => m.cookies());
    const cookieStore = await jar;
    const current = parseFacilitySettings(
      cookieStore.get(FACILITY_SETTINGS_COOKIE)?.value,
    );
    const next = { ...current, ...parsed.data };
    return cookieResponse(next, {
      ok: true,
      settings: next,
      warning: "Saved to demo store (run migration 005 for database persistence)",
    });
  }
}
