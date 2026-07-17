import {
  readProgramsState,
  type ProgramsState,
} from "@/features/programs/demo-store";
import { loadProgramsStateFromSupabase } from "@/features/programs/supabase-store";
import type {
  ClientProgramDay,
  Exercise,
  WorkoutDetail,
} from "@/features/programs/types";
import { getSessionUser } from "@/lib/auth/session";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createSignedVideoUrl } from "@/lib/video/storage";

export async function getProgramsState(): Promise<ProgramsState> {
  if (!isSupabaseConfigured()) {
    return readProgramsState();
  }
  try {
    const session = await getSessionUser();
    if (!session) {
      return readProgramsState();
    }
    // Authenticated user — RLS scopes staff (full library) vs client (published)
    const supabase = await createClient();
    return await loadProgramsStateFromSupabase(supabase);
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
  if (exercise.videoSource === "upload") {
    if (exercise.demoPlaybackUrl) return exercise.demoPlaybackUrl;
    if (exercise.videoStoragePath) {
      return createSignedVideoUrl(exercise.videoStoragePath);
    }
  }
  return null;
}

export async function listClientProgramDays(
  clientUserId: string,
): Promise<ClientProgramDay[]> {
  const state = await getProgramsState();
  const teamIds = new Set(
    state.teamMembers
      .filter((m) => m.userId === clientUserId)
      .map((m) => m.teamId),
  );

  const entries = state.calendarEntries
    .filter(
      (e) =>
        e.publishStatus === "published" &&
        (e.clientUserId === clientUserId ||
          (e.teamId != null && teamIds.has(e.teamId))),
    )
    .sort((a, b) => a.entryDate.localeCompare(b.entryDate));

  return entries.map((entry) => {
    const completion =
      state.completions.find(
        (c) =>
          c.calendarEntryId === entry.id && c.clientUserId === clientUserId,
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

export function listClientsForPrograms(state: ProgramsState) {
  const known = new Map<string, string>();
  for (const m of state.teamMembers) known.set(m.userId, m.userName);
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
