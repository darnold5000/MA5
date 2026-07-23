import { NextResponse } from "next/server";
import { z } from "zod";

import {
  facilityPatchToLocationColumns,
  getDefaultLocationSettings,
} from "@/features/settings/locations";
import { defaultFacilitySettings } from "@/features/settings/defaults";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/permissions/roles";
import { isSupabasePublicConfigured } from "@/lib/env";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";
import {
  isMa5DeploymentConfigured,
  requireMa5DeploymentContext,
} from "@/lib/tenant/deployment";

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

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ settings: defaultFacilitySettings() });
  }

  const settings = (await getDefaultLocationSettings()) ?? defaultFacilitySettings();
  return NextResponse.json({ settings });
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

  if (!session) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  if (!canAccessAdmin(session.roles)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  if (!isMa5DeploymentConfigured()) {
    return NextResponse.json(
      {
        error:
          "MA5_TENANT_ID and MA5_LOCATION_ID must be set to update facility settings",
      },
      { status: 503 },
    );
  }

  const { tenantId, locationId } = requireMa5DeploymentContext();
  const updates = facilityPatchToLocationColumns(parsed.data);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from(MA5_TABLES.locations)
      .update(updates)
      .eq("tenant_id", tenantId)
      .eq("id", locationId);

    if (error) throw error;

    const settings = await getDefaultLocationSettings();
    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    console.error("[api/admin/facility-settings]", err);
    return NextResponse.json(
      { error: "Could not update facility settings" },
      { status: 500 },
    );
  }
}
