import { publicAssetUrl } from "@/lib/assets/constants";
import {
  defaultClientProfile,
  defaultFacilitySettings,
  readDemoClientProfile,
  readDemoFacilitySettings,
  readDemoCoaches,
} from "@/features/settings/demo-store";
import {
  getDefaultLocationSettings,
} from "@/features/settings/locations";
import {
  DEFAULT_WAIVERS,
  WAIVER_LABELS,
  type ClientProfileSettings,
  type ClientWaiver,
  type CoachRosterEntry,
  type FacilitySettings,
  type WaiverKey,
  type WaiverStatus,
} from "@/features/settings/types";
import { getSessionUser } from "@/lib/auth/session";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";
import { isMa5DeploymentConfigured } from "@/lib/tenant/deployment";
import { allowDemoFallbacks, isMa5ProductionRuntime } from "@/lib/tenant/runtime-data";

export async function getClientProfileSettings(): Promise<ClientProfileSettings> {
  const session = isSupabaseConfigured() ? await getSessionUser() : null;
  const fallback = defaultClientProfile({
    fullName: session?.profile?.full_name ?? undefined,
    email: session?.email,
    phone: session?.profile?.phone ?? undefined,
  });

  if (!session || !isSupabaseConfigured()) {
    if (!allowDemoFallbacks()) return fallback;
    return readDemoClientProfile(fallback);
  }

  try {
    const supabase = await createClient();
    const { data: profile, error } = await supabase
      .from(MA5_TABLES.profiles)
      .select(
        "full_name, preferred_name, email, phone, avatar_url, emergency_name, emergency_relationship, emergency_phone, emergency_notes, notify_coach_messages, notify_session_reminders, notify_program_updates, notify_billing_alerts",
      )
      .eq("id", session.id)
      .maybeSingle();

    if (error) throw error;

    const { data: waiverRows } = await supabase
      .from(MA5_TABLES.clientWaivers)
      .select("waiver_key, status, signed_at")
      .eq("user_id", session.id);

    const waivers = mergeWaivers(
      (waiverRows ?? []) as Array<{
        waiver_key: string;
        status: string;
        signed_at: string | null;
      }>,
    );

    if (!profile) {
      if (!allowDemoFallbacks()) return fallback;
      return readDemoClientProfile(fallback);
    }

    const row = profile as Record<string, unknown>;
    const rawAvatar = (row.avatar_url as string | null) ?? null;
    const avatarUrl =
      !rawAvatar
        ? null
        : rawAvatar.startsWith("data:") || rawAvatar.startsWith("http")
          ? rawAvatar
          : publicAssetUrl(rawAvatar);

    return {
      fullName: String(row.full_name ?? "").trim() || fallback.fullName,
      preferredName:
        String(row.preferred_name ?? "").trim() || fallback.preferredName,
      email: String(row.email ?? "") || session.email || fallback.email,
      phone: String(row.phone ?? "").trim(),
      avatarUrl,
      emergencyName: String(row.emergency_name ?? "").trim(),
      emergencyRelationship: String(row.emergency_relationship ?? "").trim(),
      emergencyPhone: String(row.emergency_phone ?? "").trim(),
      emergencyNotes: String(row.emergency_notes ?? "").trim(),
      notifyCoachMessages: Boolean(row.notify_coach_messages ?? true),
      notifySessionReminders: Boolean(row.notify_session_reminders ?? true),
      notifyProgramUpdates: Boolean(row.notify_program_updates ?? true),
      notifyBillingAlerts: Boolean(row.notify_billing_alerts ?? true),
      waivers,
    };
  } catch (err) {
    console.error("[settings] profile load failed", err);
    if (isMa5ProductionRuntime()) throw err;
    if (!allowDemoFallbacks()) return fallback;
    return readDemoClientProfile(fallback);
  }
}

export async function getFacilitySettings(): Promise<FacilitySettings> {
  if (!isSupabaseConfigured()) {
    if (isMa5ProductionRuntime()) {
      throw new Error("Facility settings require Supabase on Signal Works deployment");
    }
    if (!allowDemoFallbacks()) return defaultFacilitySettings();
    return readDemoFacilitySettings();
  }

  if (isMa5DeploymentConfigured()) {
    const fromLocation = await getDefaultLocationSettings();
    if (!fromLocation) {
      throw new Error(
        "Default ma5_locations row is missing for this deployment (check MA5_LOCATION_ID)",
      );
    }
    return fromLocation;
  }

  try {
    const session = await getSessionUser();
    if (!session) {
      if (!allowDemoFallbacks()) return defaultFacilitySettings();
      return readDemoFacilitySettings();
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from(MA5_TABLES.facilitySettings)
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      if (!allowDemoFallbacks()) return defaultFacilitySettings();
      return readDemoFacilitySettings();
    }

    const logoPath = (data.logo_storage_path as string | null) ?? null;

    return {
      gymName: String(data.gym_name ?? defaultFacilitySettings().gymName),
      legalName: String(data.legal_name ?? defaultFacilitySettings().legalName),
      addressLine: String(
        data.address_line ?? defaultFacilitySettings().addressLine,
      ),
      email: String(data.email ?? defaultFacilitySettings().email),
      openGymHours: String(
        data.open_gym_hours ?? defaultFacilitySettings().openGymHours,
      ),
      coachingHours: String(
        data.coaching_hours ?? defaultFacilitySettings().coachingHours,
      ),
      hoursSummary: String(
        data.hours_summary ?? defaultFacilitySettings().hoursSummary,
      ),
      brandPrimary: String(
        data.brand_primary ?? defaultFacilitySettings().brandPrimary,
      ),
      logoStoragePath: logoPath,
      logoUrl: logoPath?.startsWith("data:")
        ? logoPath
        : logoPath
          ? publicAssetUrl(logoPath)
          : null,
      notifyFailedPayments: Boolean(data.notify_failed_payments ?? true),
      notifyNewSignups: Boolean(data.notify_new_signups ?? true),
      notifyMessageDigest: Boolean(data.notify_message_digest ?? true),
      notifyCapacityWarnings: Boolean(data.notify_capacity_warnings ?? false),
    };
  } catch (err) {
    console.error("[settings] facility load failed", err);
    if (isMa5ProductionRuntime()) throw err;
    if (!allowDemoFallbacks()) return defaultFacilitySettings();
    return readDemoFacilitySettings();
  }
}

export async function listCoaches(): Promise<CoachRosterEntry[]> {
  if (!isSupabaseConfigured()) {
    if (!allowDemoFallbacks()) return [];
    return readDemoCoaches();
  }

  try {
    const session = await getSessionUser();
    if (!session) return readDemoCoaches();

    const supabase = await createClient();
    const { data: roleRows, error: roleError } = await supabase
      .from(MA5_TABLES.userRoles)
      .select("user_id, role")
      .in("role", ["owner", "admin", "coach", "staff"]);
    if (roleError) throw roleError;

    const ids = [
      ...new Set((roleRows ?? []).map((r) => String(r.user_id))),
    ];
    if (ids.length === 0) {
      return [];
    }

    const { data: profiles, error } = await supabase
      .from(MA5_TABLES.profiles)
      .select("id, full_name, email, active")
      .in("id", ids);
    if (error) throw error;

    const roleByUser = new Map<string, string>();
    for (const row of roleRows ?? []) {
      const uid = String(row.user_id);
      const role = String(row.role);
      const prev = roleByUser.get(uid);
      const rank: Record<string, number> = {
        owner: 0,
        admin: 1,
        coach: 2,
        staff: 3,
      };
      if (!prev || (rank[role] ?? 9) < (rank[prev] ?? 9)) {
        roleByUser.set(uid, role);
      }
    }

    const roleLabel: Record<string, string> = {
      owner: "Owner · Head coach",
      admin: "Admin",
      coach: "Coach",
      staff: "Staff",
    };

    const fromDb: CoachRosterEntry[] = (profiles ?? []).map((p) => {
      const role = roleByUser.get(String(p.id)) ?? "coach";
      return {
        id: String(p.id),
        fullName:
          (p.full_name as string | null)?.trim() ||
          (p.email as string | null) ||
          "Coach",
        email: String(p.email ?? ""),
        roleLabel: roleLabel[role] ?? "Coach",
        status: "active",
      };
    });

    const demoExtras = allowDemoFallbacks() ? await readDemoCoaches() : [];
    const emails = new Set(fromDb.map((c) => c.email.toLowerCase()));
    const invited = demoExtras.filter(
      (c) =>
        c.status === "invited" && !emails.has(c.email.toLowerCase()),
    );

    return [...fromDb, ...invited].sort((a, b) =>
      a.fullName.localeCompare(b.fullName),
    );
  } catch (err) {
    console.error("[settings] coaches load failed", err);
    if (isMa5ProductionRuntime()) throw err;
    if (!allowDemoFallbacks()) return [];
    return readDemoCoaches();
  }
}

function mergeWaivers(
  rows: Array<{ waiver_key: string; status: string; signed_at: string | null }>,
): ClientWaiver[] {
  const byKey = new Map(
    rows.map((r) => [r.waiver_key as WaiverKey, r] as const),
  );
  return DEFAULT_WAIVERS.map((def) => {
    const row = byKey.get(def.key);
    if (!row) return { ...def };
    return {
      key: def.key,
      label: WAIVER_LABELS[def.key],
      status: (row.status as WaiverStatus) || def.status,
      signedAt: row.signed_at ? String(row.signed_at).slice(0, 10) : null,
    };
  });
}
