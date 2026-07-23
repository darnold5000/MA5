import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProgramsState } from "@/features/programs/state";
import type { CalendarEntry } from "@/features/programs/types";
import { MA5_TABLES } from "@/lib/supabase/tables";

import { mapCalendarRow } from "./supabase-store";

type DbClient = SupabaseClient;

export async function upsertTeamDayWorkout(input: {
  supabase: DbClient;
  teamId: string;
  workoutId: string;
  entryDate: string;
  title: string;
}): Promise<CalendarEntry> {
  const { data: existing, error: findError } = await input.supabase
    .from(MA5_TABLES.calendarEntries)
    .select("id")
    .eq("team_id", input.teamId)
    .eq("entry_date", input.entryDate)
    .maybeSingle();
  if (findError) throw new Error(findError.message);

  const payload = {
    entry_date: input.entryDate,
    workout_id: input.workoutId,
    title: input.title,
    publish_status: "published" as const,
    source: "library" as const,
    client_user_id: null,
    team_id: input.teamId,
  };

  if (existing?.id) {
    const { data, error } = await input.supabase
      .from(MA5_TABLES.calendarEntries)
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapCalendarRow(data as Record<string, unknown>);
  }

  const { data, error } = await input.supabase
    .from(MA5_TABLES.calendarEntries)
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapCalendarRow(data as Record<string, unknown>);
}

export async function clientCanAccessCalendarEntry(
  supabase: DbClient,
  clientUserId: string,
  entry: {
    id: string;
    publish_status?: string;
    publishStatus?: string;
    client_user_id?: string | null;
    clientUserId?: string | null;
    team_id?: string | null;
    teamId?: string | null;
  },
): Promise<boolean> {
  const publishStatus = entry.publish_status ?? entry.publishStatus;
  if (publishStatus !== "published") return false;

  const entryClientId = entry.client_user_id ?? entry.clientUserId ?? null;
  if (entryClientId === clientUserId) return true;

  const teamId = entry.team_id ?? entry.teamId ?? null;
  if (!teamId) return false;

  const { data, error } = await supabase
    .from(MA5_TABLES.teamMembers)
    .select("id")
    .eq("team_id", teamId)
    .eq("user_id", clientUserId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export function clientCanAccessCalendarEntryInState(
  state: ProgramsState,
  clientUserId: string,
  entry: CalendarEntry,
): boolean {
  if (entry.publishStatus !== "published") return false;
  if (entry.clientUserId === clientUserId) return true;
  if (!entry.teamId) return false;
  return state.teamMembers.some(
    (member) => member.teamId === entry.teamId && member.userId === clientUserId,
  );
}
