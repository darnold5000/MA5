import { cookies } from "next/headers";

import {
  defaultClientProfile,
  defaultFacilitySettings,
} from "@/features/settings/defaults";
import {
  type ClientProfileSettings,
  type CoachRosterEntry,
  type FacilitySettings,
} from "@/features/settings/types";
import { allowDemoFallbacks } from "@/lib/tenant/runtime-data";

export const PROFILE_SETTINGS_COOKIE = "ma5_profile_settings";
export const FACILITY_SETTINGS_COOKIE = "ma5_facility_settings";
export const COACHES_COOKIE = "ma5_coaches";

export { defaultClientProfile, defaultFacilitySettings };

export function defaultCoaches(): CoachRosterEntry[] {
  if (!allowDemoFallbacks()) return [];
  return [
    {
      id: "coach-robert",
      fullName: "Robert Anderson",
      email: "robert@ma5.com",
      roleLabel: "Owner · Head coach",
      status: "active",
    },
    {
      id: "coach-mike",
      fullName: "Mike",
      email: "mike@ma5.com",
      roleLabel: "Coach",
      status: "active",
    },
  ];
}

export function parseClientProfile(
  raw: string | undefined,
  fallback: ClientProfileSettings,
): ClientProfileSettings {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<ClientProfileSettings>;
    return {
      ...fallback,
      ...parsed,
      waivers: Array.isArray(parsed.waivers)
        ? parsed.waivers
        : fallback.waivers,
    };
  } catch {
    return fallback;
  }
}

export async function readDemoClientProfile(
  fallback: ClientProfileSettings,
): Promise<ClientProfileSettings> {
  if (!allowDemoFallbacks()) return fallback;
  const jar = await cookies();
  return parseClientProfile(
    jar.get(PROFILE_SETTINGS_COOKIE)?.value,
    fallback,
  );
}

export function parseFacilitySettings(
  raw: string | undefined,
): FacilitySettings {
  const base = defaultFacilitySettings();
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw) as Partial<FacilitySettings>;
    const merged = { ...base, ...parsed };
    if (merged.logoStoragePath?.startsWith("data:")) {
      merged.logoUrl = merged.logoStoragePath;
    }
    return merged;
  } catch {
    return base;
  }
}

export function parseCoaches(raw: string | undefined): CoachRosterEntry[] {
  if (!raw) return defaultCoaches();
  try {
    const parsed = JSON.parse(raw) as CoachRosterEntry[];
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : defaultCoaches();
  } catch {
    return defaultCoaches();
  }
}

export async function readDemoFacilitySettings(): Promise<FacilitySettings> {
  if (!allowDemoFallbacks()) return defaultFacilitySettings();
  const jar = await cookies();
  return parseFacilitySettings(jar.get(FACILITY_SETTINGS_COOKIE)?.value);
}

export async function readDemoCoaches(): Promise<CoachRosterEntry[]> {
  if (!allowDemoFallbacks()) return [];
  const jar = await cookies();
  return parseCoaches(jar.get(COACHES_COOKIE)?.value);
}

export function serializeClientProfile(profile: ClientProfileSettings): string {
  return JSON.stringify(profile);
}

export function serializeFacilitySettings(
  settings: FacilitySettings,
): string {
  return JSON.stringify(settings);
}

export function serializeCoaches(coaches: CoachRosterEntry[]): string {
  return JSON.stringify(coaches);
}
