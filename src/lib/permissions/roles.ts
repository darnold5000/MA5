export const PLATFORM_ROLES = [
  "owner",
  "admin",
  "staff",
  "coach",
  "client",
] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export type Capability =
  | "manage_business_settings"
  | "manage_staff"
  | "view_financials"
  | "manage_clients"
  | "manage_schedule"
  | "manage_memberships"
  | "manage_content"
  | "view_reports"
  | "manage_attendance"
  | "view_schedule"
  | "coach_clients"
  | "assign_programs"
  | "manage_programs"
  | "manage_teams"
  | "message_clients"
  | "book_sessions"
  | "manage_own_billing"
  | "view_own_programs";

const ROLE_CAPABILITIES: Record<PlatformRole, readonly Capability[]> = {
  owner: [
    "manage_business_settings",
    "manage_staff",
    "view_financials",
    "manage_clients",
    "manage_schedule",
    "manage_memberships",
    "manage_content",
    "view_reports",
    "manage_attendance",
    "view_schedule",
    "coach_clients",
    "assign_programs",
    "manage_programs",
    "manage_teams",
    "message_clients",
    "book_sessions",
    "manage_own_billing",
    "view_own_programs",
  ],
  admin: [
    "manage_clients",
    "manage_schedule",
    "manage_memberships",
    "manage_content",
    "manage_programs",
    "manage_teams",
    "view_reports",
    "manage_attendance",
    "view_schedule",
    "message_clients",
    "book_sessions",
    "manage_own_billing",
    "view_own_programs",
  ],
  staff: [
    "view_schedule",
    "manage_attendance",
    "book_sessions",
    "manage_own_billing",
    "view_own_programs",
  ],
  coach: [
    "view_schedule",
    "coach_clients",
    "assign_programs",
    "manage_programs",
    "manage_teams",
    "message_clients",
    "manage_attendance",
    "book_sessions",
    "manage_own_billing",
    "view_own_programs",
  ],
  client: [
    "book_sessions",
    "manage_own_billing",
    "view_own_programs",
  ],
};

export function hasCapability(
  roles: readonly PlatformRole[],
  capability: Capability,
): boolean {
  return roles.some((role) => ROLE_CAPABILITIES[role].includes(capability));
}

export function isStaffRole(role: PlatformRole): boolean {
  return role !== "client";
}

export function canAccessAdmin(roles: readonly PlatformRole[]): boolean {
  return roles.some(isStaffRole);
}

export function canAccessClientApp(roles: readonly PlatformRole[]): boolean {
  return roles.length > 0;
}
