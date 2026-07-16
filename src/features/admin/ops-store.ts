import { cookies } from "next/headers";

import type { BookingItem, SessionItem } from "@/features/scheduling/fallback-data";
import {
  FALLBACK_BOOKINGS,
  FALLBACK_CLASS_TYPES,
  FALLBACK_SESSIONS,
} from "@/features/scheduling/fallback-data";

export const ADMIN_OPS_COOKIE = "ma5_admin_ops";

export type StaffClient = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  status: "active" | "inactive";
  notes: string;
};

export type RosterEntry = BookingItem & {
  clientName: string;
  clientEmail: string;
};

export type AdminOpsState = {
  customSessions: SessionItem[];
  sessionPatches: Record<
    string,
      Partial<Pick<
      SessionItem,
      | "title"
      | "description"
      | "startsAt"
      | "endsAt"
      | "durationMinutes"
      | "capacity"
      | "priceCents"
      | "status"
      | "coachName"
      | "bookedCount"
      | "locationName"
    >>
  >;
  roster: RosterEntry[];
  clients: StaffClient[];
};

const DEFAULT_CLIENTS: StaffClient[] = [
  {
    id: "client-alex",
    fullName: "Alex Rivera",
    email: "alex@example.com",
    phone: "(317) 555-0142",
    status: "active",
    notes: "14x membership",
  },
  {
    id: "client-jordan",
    fullName: "Jordan Lee",
    email: "jordan@example.com",
    phone: "(317) 555-0198",
    status: "active",
    notes: "Open gym + small group",
  },
  {
    id: "client-sam",
    fullName: "Sam Patel",
    email: "sam@example.com",
    phone: "(317) 555-0110",
    status: "inactive",
    notes: "Paused membership",
  },
];

function defaultRoster(): RosterEntry[] {
  return FALLBACK_BOOKINGS.map((b) => ({
    ...b,
    clientName: "Alex Rivera",
    clientEmail: "alex@example.com",
  }));
}

export function emptyOpsState(): AdminOpsState {
  return {
    customSessions: [],
    sessionPatches: {},
    roster: defaultRoster(),
    clients: DEFAULT_CLIENTS,
  };
}

export function parseOpsState(raw: string | undefined): AdminOpsState {
  if (!raw) return emptyOpsState();
  try {
    const parsed = JSON.parse(raw) as Partial<AdminOpsState>;
    return {
      customSessions: Array.isArray(parsed.customSessions)
        ? parsed.customSessions
        : [],
      sessionPatches:
        parsed.sessionPatches && typeof parsed.sessionPatches === "object"
          ? parsed.sessionPatches
          : {},
      roster: Array.isArray(parsed.roster) ? parsed.roster : defaultRoster(),
      clients: Array.isArray(parsed.clients) ? parsed.clients : DEFAULT_CLIENTS,
    };
  } catch {
    return emptyOpsState();
  }
}

export async function readOpsState(): Promise<AdminOpsState> {
  const jar = await cookies();
  return parseOpsState(jar.get(ADMIN_OPS_COOKIE)?.value);
}

export function serializeOpsState(state: AdminOpsState): string {
  return JSON.stringify(state);
}

export function mergeSessions(state: AdminOpsState): SessionItem[] {
  const base = FALLBACK_SESSIONS.map((session) => {
    const patch = state.sessionPatches[session.id];
    return patch ? { ...session, ...patch } : session;
  });
  return [...base, ...state.customSessions].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt),
  );
}

export function classTypeOptions() {
  return FALLBACK_CLASS_TYPES;
}

export function createSessionDraft(input: {
  classTypeId: string;
  startsAt: string;
  durationMinutes?: number;
  capacity?: number;
  priceCents?: number;
  coachName?: string;
}): SessionItem {
  const classType =
    FALLBACK_CLASS_TYPES.find((c) => c.id === input.classTypeId) ??
    FALLBACK_CLASS_TYPES[1];
  const durationMinutes =
    input.durationMinutes ?? classType.defaultDurationMinutes;
  const start = new Date(input.startsAt);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return {
    id: `sess-custom-${Date.now()}`,
    classTypeId: classType.id,
    title: classType.name,
    description: classType.description,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    durationMinutes,
    capacity: input.capacity ?? classType.defaultCapacity,
    bookedCount: 0,
    priceCents: input.priceCents ?? classType.defaultPriceCents,
    locationName: "MA5 Performance — Avon, IN",
    status: "published",
    coachName: input.coachName ?? "Robert Anderson",
    source: "demo",
  };
}
