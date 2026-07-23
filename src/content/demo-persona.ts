export type DemoPersona = "client" | "staff";

export const DEMO_PERSONA_COOKIE = "ma5_demo_persona";

/** Test fixtures for local demo flows — not used in production runtime. */
export const TEST_CLIENT_EMAIL = "ma5client@example.com";
export const TEST_COACH_EMAIL = "mike@ma5.com";

export const demoClient = {
  firstName: "Alex",
  fullName: "Alex",
  email: TEST_CLIENT_EMAIL,
  membership: {
    name: "No active plan",
    shortLabel: "No plan",
    sessionsRemaining: 8,
    sessionsIncluded: 14,
    renewsOn: "",
    status: "None",
    streakWeeks: 2,
  },
  inboxUnread: 2,
  coachMessage: {
    from: "Robert Anderson",
    preview:
      "Great work this week. Let’s keep Thursday’s small group on the schedule and add one recovery session.",
  },
  programProgress: {
    name: "Strength Foundations",
    percent: 75,
  },
} as const;

export function isDemoPersona(value: string | undefined | null): value is DemoPersona {
  return value === "client" || value === "staff";
}

export function resolveClientFirstName(input?: {
  email?: string | null;
  fullName?: string | null;
} | null): string {
  const fromProfile = input?.fullName?.trim().split(/\s+/)[0];
  if (fromProfile) return fromProfile;
  const emailLocal = input?.email?.trim().split("@")[0];
  if (emailLocal) {
    return emailLocal.charAt(0).toUpperCase() + emailLocal.slice(1);
  }
  return "Member";
}

export function resolveClientFullName(input?: {
  email?: string | null;
  fullName?: string | null;
} | null): string {
  const fromProfile = input?.fullName?.trim();
  if (fromProfile) return fromProfile;
  return resolveClientFirstName(input);
}
