import { siteConfig } from "@/content/site-config";
import {
  DEFAULT_WAIVERS,
  type ClientProfileSettings,
  type FacilitySettings,
} from "@/features/settings/types";

/** Site-config defaults — not demo roster or cookie state. */
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

export function defaultClientProfile(input?: {
  fullName?: string;
  email?: string;
  phone?: string;
}): ClientProfileSettings {
  const fullName = input?.fullName?.trim() ?? "";
  const preferredName = fullName.split(/\s+/)[0] ?? "";
  return {
    fullName,
    preferredName,
    email: input?.email ?? "",
    phone: input?.phone ?? "",
    avatarUrl: null,
    emergencyName: "",
    emergencyRelationship: "",
    emergencyPhone: "",
    emergencyNotes: "",
    notifyCoachMessages: true,
    notifySessionReminders: true,
    notifyProgramUpdates: true,
    notifyBillingAlerts: true,
    waivers: DEFAULT_WAIVERS.map((w) => ({ ...w })),
  };
}

export type { FacilitySettings };
