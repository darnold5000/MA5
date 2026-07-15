export const DEMO_PERSONA_COOKIE = "ma5_demo_persona";

export type DemoPersona = "client" | "staff";

export const demoClient = {
  firstName: "Alex",
  fullName: "Alex Rivera",
  email: "alex@example.com",
  membership: {
    name: "14x Monthly Membership",
    sessionsRemaining: 8,
    sessionsIncluded: 14,
    renewsOn: "August 1",
    status: "Active",
  },
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
