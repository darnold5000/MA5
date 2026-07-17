import {
  readProgramsState,
  type ProgramsState,
} from "@/features/programs/demo-store";
import {
  buildClientTrainingProgress,
  buildCoachClientProgressRow,
  resolveProgramsClientIds,
} from "@/features/programs/progress";
import { loadProgramsStateFromSupabase } from "@/features/programs/supabase-store";
import type {
  ClientProgramDay,
  ClientTrainingProgress,
  CoachClientProgressRow,
  Exercise,
  WorkoutDetail,
} from "@/features/programs/types";
import { getSessionUser } from "@/lib/auth/session";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";
import { createSignedVideoUrl } from "@/lib/video/storage";

async function withSignedPlayback(state: ProgramsState): Promise<ProgramsState> {
  const exercises = await Promise.all(
    state.exercises.map(async (ex) => {
      if (ex.videoSource !== "upload" || !ex.videoStoragePath) return ex;
      const url = await createSignedVideoUrl(ex.videoStoragePath);
      return { ...ex, demoPlaybackUrl: url };
    }),
  );
  return { ...state, exercises };
}

export async function getProgramsState(): Promise<ProgramsState> {
  if (!isSupabaseConfigured()) {
    return readProgramsState();
  }
  try {
    const session = await getSessionUser();
    if (!session) {
      return readProgramsState();
    }
    const supabase = await createClient();
    const state = await loadProgramsStateFromSupabase(supabase);
    return withSignedPlayback(state);
  } catch (err) {
    console.error("[programs] Supabase load failed, falling back to cookie", err);
    return readProgramsState();
  }
}

export function getWorkoutDetail(
  state: ProgramsState,
  workoutId: string,
): WorkoutDetail | null {
  const workout = state.workouts.find((w) => w.id === workoutId);
  if (!workout) return null;
  const blocks = state.workoutBlocks
    .filter((b) => b.workoutId === workoutId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((block) => ({
      ...block,
      exercise: state.exercises.find((e) => e.id === block.exerciseId) ?? null,
    }));
  return { ...workout, blocks };
}

export async function resolveExercisePlayback(
  exercise: Exercise,
): Promise<string | null> {
  if (exercise.videoSource !== "upload") return null;
  if (exercise.demoPlaybackUrl) return exercise.demoPlaybackUrl;
  if (exercise.videoStoragePath) {
    return createSignedVideoUrl(exercise.videoStoragePath);
  }
  return null;
}

function mapClientDays(
  state: ProgramsState,
  clientIds: string[],
): ClientProgramDay[] {
  const teamIds = new Set(
    state.teamMembers
      .filter((m) => clientIds.includes(m.userId))
      .map((m) => m.teamId),
  );

  const entries = state.calendarEntries
    .filter(
      (e) =>
        e.publishStatus === "published" &&
        ((e.clientUserId != null && clientIds.includes(e.clientUserId)) ||
          (e.teamId != null && teamIds.has(e.teamId))),
    )
    .sort((a, b) => a.entryDate.localeCompare(b.entryDate));

  return entries.map((entry) => {
    const completion =
      state.completions.find(
        (c) =>
          c.calendarEntryId === entry.id &&
          clientIds.includes(c.clientUserId),
      ) ?? null;
    const team = entry.teamId
      ? state.teams.find((t) => t.id === entry.teamId)
      : null;
    return {
      entry,
      workout: entry.workoutId
        ? getWorkoutDetail(state, entry.workoutId)
        : null,
      completed: Boolean(completion),
      completion,
      sourceLabel: team ? `Team · ${team.name}` : "Individual",
    };
  });
}

export async function listClientProgramDays(
  clientUserId: string,
  email?: string | null,
): Promise<ClientProgramDay[]> {
  const state = await getProgramsState();
  const clientIds = resolveProgramsClientIds(clientUserId, email);
  return mapClientDays(state, clientIds);
}

export async function getClientTrainingProgress(
  clientUserId: string,
  email?: string | null,
): Promise<ClientTrainingProgress> {
  const state = await getProgramsState();
  const clientIds = resolveProgramsClientIds(clientUserId, email);
  const days = mapClientDays(state, clientIds);
  return buildClientTrainingProgress(days, state, clientIds);
}

export async function listCoachClientProgress(): Promise<
  CoachClientProgressRow[]
> {
  const state = await getProgramsState();
  const roster = await listRosterClients();
  const rows = roster.map((client) => {
    const days = mapClientDays(state, [client.id]);
    return buildCoachClientProgressRow(client.id, client.name, days, state);
  });

  return rows.sort((a, b) => {
    const statusRank = { stale: 0, watch: 1, active: 2 } as const;
    if (statusRank[a.status] !== statusRank[b.status]) {
      return statusRank[a.status] - statusRank[b.status];
    }
    return a.clientName.localeCompare(b.clientName);
  });
}

/** Real roster: active profiles with the client role. */
export async function listRosterClients(): Promise<
  Array<{ id: string; name: string }>
> {
  if (!isSupabaseConfigured()) {
    return listClientsForPrograms(await readProgramsState());
  }
  try {
    const session = await getSessionUser();
    if (!session) {
      return listClientsForPrograms(await readProgramsState());
    }
    const supabase = await createClient();
    const { data: roleRows, error: roleError } = await supabase
      .from(MA5_TABLES.userRoles)
      .select("user_id")
      .eq("role", "client");
    if (roleError) throw new Error(roleError.message);

    const ids = [...new Set((roleRows ?? []).map((r) => String(r.user_id)))];
    if (ids.length === 0) return [];

    const { data: profiles, error } = await supabase
      .from(MA5_TABLES.profiles)
      .select("id, full_name, email, active")
      .in("id", ids)
      .eq("active", true)
      .order("full_name", { ascending: true });
    if (error) throw new Error(error.message);

    return (profiles ?? []).map((p) => ({
      id: String(p.id),
      name:
        (p.full_name as string | null)?.trim() ||
        (p.email as string | null) ||
        "Client",
    }));
  } catch (err) {
    console.error("[programs] roster load failed", err);
    return listClientsForPrograms(await getProgramsState());
  }
}

/** @deprecated Prefer listRosterClients — kept for cookie-demo fallbacks */
export function listClientsForPrograms(state: ProgramsState) {
  const known = new Map<string, string>();
  for (const m of state.teamMembers) known.set(m.userId, m.userName);
  for (const a of state.assignments) {
    if (a.clientUserId && !known.has(a.clientUserId)) {
      known.set(a.clientUserId, a.clientUserId);
    }
  }
  const hasRealProfiles = [...known.keys()].some((id) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id),
  );
  if (!hasRealProfiles) {
    known.set("client-alex", known.get("client-alex") ?? "Alex");
    known.set("client-jordan", known.get("client-jordan") ?? "Jordan Lee");
    known.set("client-sam", known.get("client-sam") ?? "Sam Patel");
  }
  return Array.from(known.entries()).map(([id, name]) => ({ id, name }));
}
