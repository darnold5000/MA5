import { publicAssetUrl } from "@/lib/assets/constants";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";
import {
  isMa5DeploymentConfigured,
  requireMa5DeploymentContext,
} from "@/lib/tenant/deployment";

import {
  type FacilitySettings,
} from "./types";
import { defaultFacilitySettings } from "@/features/settings/defaults";

export type LocationRow = {
  id: string;
  tenant_id: string;
  slug: string;
  name: string;
  legal_name: string | null;
  address_line: string | null;
  email: string | null;
  open_gym_hours: string | null;
  coaching_hours: string | null;
  hours_summary: string | null;
  brand_primary: string;
  logo_storage_path: string | null;
  notify_failed_payments: boolean;
  notify_new_signups: boolean;
  notify_message_digest: boolean;
  notify_capacity_warnings: boolean;
};

export function mapLocationToFacilitySettings(
  row: LocationRow,
): FacilitySettings {
  const logoPath = row.logo_storage_path;
  return {
    gymName: row.name,
    legalName: row.legal_name ?? "",
    addressLine: row.address_line ?? "",
    email: row.email ?? "",
    openGymHours: row.open_gym_hours ?? "",
    coachingHours: row.coaching_hours ?? "",
    hoursSummary: row.hours_summary ?? "",
    brandPrimary: row.brand_primary,
    logoStoragePath: logoPath,
    logoUrl: logoPath?.startsWith("data:")
      ? logoPath
      : logoPath
        ? publicAssetUrl(logoPath)
        : null,
    notifyFailedPayments: row.notify_failed_payments,
    notifyNewSignups: row.notify_new_signups,
    notifyMessageDigest: row.notify_message_digest,
    notifyCapacityWarnings: row.notify_capacity_warnings,
  };
}

export function facilityPatchToLocationColumns(
  patch: Partial<FacilitySettings>,
): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  if (patch.gymName !== undefined) updates.name = patch.gymName;
  if (patch.legalName !== undefined) updates.legal_name = patch.legalName;
  if (patch.addressLine !== undefined) updates.address_line = patch.addressLine;
  if (patch.email !== undefined) updates.email = patch.email;
  if (patch.openGymHours !== undefined) {
    updates.open_gym_hours = patch.openGymHours;
  }
  if (patch.coachingHours !== undefined) {
    updates.coaching_hours = patch.coachingHours;
  }
  if (patch.hoursSummary !== undefined) {
    updates.hours_summary = patch.hoursSummary;
  }
  if (patch.brandPrimary !== undefined) {
    updates.brand_primary = patch.brandPrimary;
  }
  if (patch.logoStoragePath !== undefined) {
    updates.logo_storage_path = patch.logoStoragePath;
  }
  if (patch.notifyFailedPayments !== undefined) {
    updates.notify_failed_payments = patch.notifyFailedPayments;
  }
  if (patch.notifyNewSignups !== undefined) {
    updates.notify_new_signups = patch.notifyNewSignups;
  }
  if (patch.notifyMessageDigest !== undefined) {
    updates.notify_message_digest = patch.notifyMessageDigest;
  }
  if (patch.notifyCapacityWarnings !== undefined) {
    updates.notify_capacity_warnings = patch.notifyCapacityWarnings;
  }
  return updates;
}

export async function getDefaultLocationSettings(): Promise<FacilitySettings | null> {
  if (!isSupabaseConfigured() || !isMa5DeploymentConfigured()) {
    return null;
  }

  const { locationId } = requireMa5DeploymentContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(MA5_TABLES.locations)
    .select(
      "id, tenant_id, slug, name, legal_name, address_line, email, open_gym_hours, coaching_hours, hours_summary, brand_primary, logo_storage_path, notify_failed_payments, notify_new_signups, notify_message_digest, notify_capacity_warnings",
    )
    .eq("id", locationId)
    .maybeSingle();

  if (error || !data) return null;
  return mapLocationToFacilitySettings(data as LocationRow);
}

export async function getLocationNameById(
  locationId: string,
): Promise<string | null> {
  if (!isSupabaseConfigured() || !isMa5DeploymentConfigured()) {
    return null;
  }

  const { tenantId } = requireMa5DeploymentContext();
  const supabase = await createClient();
  const { data } = await supabase
    .from(MA5_TABLES.locations)
    .select("name")
    .eq("tenant_id", tenantId)
    .eq("id", locationId)
    .maybeSingle();

  return (data?.name as string | undefined) ?? null;
}

export function defaultLocationLabel(): string {
  return defaultFacilitySettings().gymName;
}
