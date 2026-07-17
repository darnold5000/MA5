export type WaiverKey = "liability" | "facility_rules" | "media_release";
export type WaiverStatus = "signed" | "pending" | "declined";

export type ClientWaiver = {
  key: WaiverKey;
  label: string;
  status: WaiverStatus;
  signedAt: string | null;
};

export type ClientProfileSettings = {
  fullName: string;
  preferredName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  emergencyName: string;
  emergencyRelationship: string;
  emergencyPhone: string;
  emergencyNotes: string;
  notifyCoachMessages: boolean;
  notifySessionReminders: boolean;
  notifyProgramUpdates: boolean;
  notifyBillingAlerts: boolean;
  waivers: ClientWaiver[];
};

export type FacilitySettings = {
  gymName: string;
  legalName: string;
  addressLine: string;
  email: string;
  openGymHours: string;
  coachingHours: string;
  hoursSummary: string;
  brandPrimary: string;
  logoStoragePath: string | null;
  logoUrl: string | null;
  notifyFailedPayments: boolean;
  notifyNewSignups: boolean;
  notifyMessageDigest: boolean;
  notifyCapacityWarnings: boolean;
};

export type CoachRosterEntry = {
  id: string;
  fullName: string;
  email: string;
  roleLabel: string;
  status: "active" | "invited";
};

export const WAIVER_LABELS: Record<WaiverKey, string> = {
  liability: "Liability waiver",
  facility_rules: "Facility rules acknowledgment",
  media_release: "Photo / media release",
};

export const DEFAULT_WAIVERS: ClientWaiver[] = [
  {
    key: "liability",
    label: WAIVER_LABELS.liability,
    status: "signed",
    signedAt: "2026-01-12",
  },
  {
    key: "facility_rules",
    label: WAIVER_LABELS.facility_rules,
    status: "signed",
    signedAt: "2026-01-12",
  },
  {
    key: "media_release",
    label: WAIVER_LABELS.media_release,
    status: "pending",
    signedAt: null,
  },
];
