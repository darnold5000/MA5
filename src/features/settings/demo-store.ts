import { cookies } from "next/headers";

import { siteConfig } from "@/content/site-config";
import {
  DEFAULT_WAIVERS,
  type ClientProfileSettings,
  type CoachRosterEntry,
  type FacilitySettings,
} from "@/features/settings/types";

export const PROFILE_SETTINGS_COOKIE = "ma5_profile_settings";
export const FACILITY_SETTINGS_COOKIE = "ma5_facility_settings";
export const COACHES_COOKIE = "ma5_coaches";

export function defaultFacilitySettings(): FacilitySettings {
  return {
    gymName: siteConfig.name,
    legalName: siteConfig.legalName,
    addressLine: siteConfig.location.fullAddress,
    email: siteConfig.contact.email,
    openGymHours: siteConfig.hours.openGym,
    coachingHours: "By appointment",
    hoursSummary: siteConfig.hours.summary,
    brandPrimary: "#E2062B",
    logoStoragePath: null,
    logoUrl: null,
    notifyFailedPayments: true,
    notifyNewSignups: true,
    notifyMessageDigest: true,
    notifyCapacityWarnings: false,
  };
}

export function defaultCoaches(): CoachRosterEntry[] {
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

export function defaultClientProfile(input?: {
  fullName?: string;
  email?: string;
  phone?: string;
}): ClientProfileSettings {
  return {
    fullName: input?.fullName ?? "Alex",
    preferredName: input?.fullName?.split(/\s+/)[0] ?? "Alex",
    email: input?.email ?? "ma5client@example.com",
    phone: input?.phone ?? "(317) 555-0142",
    avatarUrl: null,
    emergencyName: "Pat Rivera",
    emergencyRelationship: "Spouse",
    emergencyPhone: "(317) 555-0199",
    emergencyNotes: "Call if unreachable after session",
    notifyCoachMessages: true,
    notifySessionReminders: true,
    notifyProgramUpdates: true,
    notifyBillingAlerts: true,
    waivers: DEFAULT_WAIVERS.map((w) => ({ ...w })),
  };
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

export async function readDemoClientProfile(
  fallback: ClientProfileSettings,
): Promise<ClientProfileSettings> {
  const jar = await cookies();
  return parseClientProfile(
    jar.get(PROFILE_SETTINGS_COOKIE)?.value,
    fallback,
  );
}

export async function readDemoFacilitySettings(): Promise<FacilitySettings> {
  const jar = await cookies();
  return parseFacilitySettings(jar.get(FACILITY_SETTINGS_COOKIE)?.value);
}

export async function readDemoCoaches(): Promise<CoachRosterEntry[]> {
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
