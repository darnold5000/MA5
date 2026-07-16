export const DEMO_PERSONA_COOKIE = "ma5_demo_persona";

export type DemoPersona = "client" | "staff";

/** Real Supabase test client used for Stripe / Hub demos */
export const TEST_CLIENT_EMAIL = "ma5client@example.com";

export const demoClient = {
  firstName: "Alex",
  fullName: "Alex",
  email: TEST_CLIENT_EMAIL,
  membership: {
    name: "14x Monthly Membership",
    shortLabel: "14x Membership",
    sessionsRemaining: 8,
    sessionsIncluded: 14,
    renewsOn: "August 1",
    status: "Active",
    streakWeeks: 2,
  },
  inboxUnread: 2,
  coachMessage: {
    from: "Robert Anderson",
    preview:
      "Great work this week. Let’s keep Thursday’s small group on the schedule and add one recovery session.",
  },
  programProgress: {
    name: "MA5 Foundations",
    percent: 62,
  },
} as const;

export function isDemoPersona(value: string | undefined | null): value is DemoPersona {
  return value === "client" || value === "staff";
}

/** Hub greeting + sidebar name — test client is always Alex */
export function resolveClientFirstName(input?: {
  email?: string | null;
  fullName?: string | null;
} | null): string {
  const email = input?.email?.trim().toLowerCase();
  if (!email || email === TEST_CLIENT_EMAIL.toLowerCase()) {
    return demoClient.firstName;
  }
  const fromProfile = input?.fullName?.trim().split(/\s+/)[0];
  return fromProfile || demoClient.firstName;
}

export function resolveClientFullName(input?: {
  email?: string | null;
  fullName?: string | null;
} | null): string {
  const email = input?.email?.trim().toLowerCase();
  if (!email || email === TEST_CLIENT_EMAIL.toLowerCase()) {
    return demoClient.fullName;
  }
  return input?.fullName?.trim() || demoClient.fullName;
}
