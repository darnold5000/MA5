/**
 * Shared filters for member/client profile queries.
 * Operational lists require client_status = active AND deleted_at IS NULL.
 */

import {
  asClientStatus,
  deriveClientStatusFromLegacy,
  type ClientStatus,
  type ProfileLifecycleRow,
} from "@/lib/auth/client-lifecycle";
import { MA5_TABLES } from "@/lib/supabase/tables";

/** Profiles eligible for admin roster / messaging / enrollment dropdowns. */
export function isSelectableClientProfile(
  profile: ProfileLifecycleRow | null | undefined,
): boolean {
  if (!profile) return false;
  if (profile.deleted_at) return false;
  return deriveClientStatusFromLegacy(profile) === "active";
}

/** True when profile may receive normal client communications. */
export function isActiveOperationalClient(
  profile: ProfileLifecycleRow | null | undefined,
): boolean {
  return isSelectableClientProfile(profile);
}

/** Invitation reminder audience — only invited, non-deleted clients. */
export function isInvitedClientProfile(
  profile: ProfileLifecycleRow | null | undefined,
): boolean {
  if (!profile || profile.deleted_at) return false;
  return deriveClientStatusFromLegacy(profile) === "invited";
}

export function isDeletedClientProfile(
  profile: ProfileLifecycleRow | null | undefined,
): boolean {
  if (!profile) return false;
  return deriveClientStatusFromLegacy(profile) === "deleted";
}

export function clientStatusOrInvited(
  profile: ProfileLifecycleRow | null | undefined,
): ClientStatus {
  if (!profile) return "invited";
  return deriveClientStatusFromLegacy(profile);
}

export const ACTIVE_CLIENT_STATUS = "active" as const;
export const INVITED_CLIENT_STATUS = "invited" as const;

type FilterableQuery = {
  eq: (column: string, value: unknown) => FilterableQuery;
  is: (column: string, value: null) => FilterableQuery;
};

/** PostgREST: client_status = active AND deleted_at IS NULL */
// Supabase query-builder generics recurse deeply; keep this helper loosely typed.
export function applyActiveClientFilter<T>(query: T): T {
  const chain = query as unknown as FilterableQuery;
  return chain
    .eq("client_status", ACTIVE_CLIENT_STATUS)
    .is("deleted_at", null) as T;
}

/** PostgREST: client_status = invited AND deleted_at IS NULL */
export function applyInvitedClientFilter<T>(query: T): T {
  const chain = query as unknown as FilterableQuery;
  return chain
    .eq("client_status", INVITED_CLIENT_STATUS)
    .is("deleted_at", null) as T;
}

type ProfileIdRow = { id: string };

/** Resolve ids to active operational clients only (messaging, announcements). */
export async function filterToActiveClientIds(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  ids: string[],
): Promise<string[]> {
  if (ids.length === 0) return [];

  const { data: profiles } = await applyActiveClientFilter(
    supabase.from(MA5_TABLES.profiles).select("id").in("id", ids),
  );

  return ((profiles ?? []) as ProfileIdRow[]).map((p) => String(p.id));
}

export function profilePassesDirectoryFilter(profile: {
  client_status?: string | null;
  deleted_at?: string | null;
  invitation_status?: string | null;
  active?: boolean | null;
}): boolean {
  if (profile.deleted_at) return false;
  if (profile.client_status) {
    return asClientStatus(profile.client_status) !== "deleted";
  }
  return Boolean(profile.active);
}
