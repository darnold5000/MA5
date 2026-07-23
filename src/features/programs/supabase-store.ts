import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProgramsState } from "@/features/programs/state";
import { addDaysIso } from "@/features/programs/state";
import type {
  AssignmentStatus,
  CalendarEntry,
  CalendarSource,
  Exercise,
  ExerciseCategory,
  ExerciseParam,
  Program,
  ProgramAssignment,
  ProgramDay,
  PublishStatus,
  Team,
  TeamMember,
  VideoSource,
  Workout,
  WorkoutBlock,
  WorkoutBlockSet,
  WorkoutCompletion,
  WorkoutSetLog,
} from "@/features/programs/types";
import type { Ma5DeploymentContext } from "@/lib/tenant/deployment";
import { withTenantId } from "@/lib/tenant/deployment";
import { MA5_TABLES } from "@/lib/supabase/tables";

type DbClient = SupabaseClient;

function asCategory(value: string | null | undefined): ExerciseCategory {
  return (value as ExerciseCategory) || "Legs";
}

function asVideoSource(value: string | null | undefined): VideoSource {
  if (
    value === "upload" ||
    value === "youtube" ||
    value === "vimeo" ||
    value === "none"
  ) {
    return value;
  }
  return "none";
}

function asParam(value: string | null | undefined, fallback: ExerciseParam): ExerciseParam {
  return value === "reps" || value === "weight_lb" ? value : fallback;
}

export function mapExerciseRow(row: Record<string, unknown>): Exercise {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    category: asCategory(row.category as string),
    pointsOfPerformance: String(row.points_of_performance ?? ""),
    videoSource: asVideoSource(row.video_source as string),
    videoUrl: (row.video_url as string | null) ?? null,
    videoStoragePath: (row.video_storage_path as string | null) ?? null,
    demoPlaybackUrl: null,
    defaultParam1: asParam(row.default_param_1 as string, "reps"),
    defaultParam2: asParam(row.default_param_2 as string, "weight_lb"),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export function mapWorkoutRow(row: Record<string, unknown>): Workout {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    coachInstructions: String(row.coach_instructions ?? ""),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export function mapProgramRow(row: Record<string, unknown>): Program {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    weeks: Number(row.weeks ?? 1),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export function mapProgramDayRow(row: Record<string, unknown>): ProgramDay {
  return {
    id: String(row.id),
    programId: String(row.program_id),
    weekIndex: Number(row.week_index),
    dayIndex: Number(row.day_index),
    workoutId: (row.workout_id as string | null) ?? null,
  };
}

export function mapTeamRow(row: Record<string, unknown>): Team {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    difficulty: (row.difficulty as string | null) ?? null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export function mapAssignmentRow(row: Record<string, unknown>): ProgramAssignment {
  return {
    id: String(row.id),
    programId: (row.program_id as string | null) ?? null,
    clientUserId: (row.client_user_id as string | null) ?? null,
    teamId: (row.team_id as string | null) ?? null,
    startDate: String(row.start_date),
    status: (row.status as AssignmentStatus) ?? "active",
  };
}

export function mapCalendarRow(row: Record<string, unknown>): CalendarEntry {
  return {
    id: String(row.id),
    entryDate: String(row.entry_date),
    workoutId: (row.workout_id as string | null) ?? null,
    title: String(row.title ?? ""),
    publishStatus: (row.publish_status as PublishStatus) ?? "draft",
    source: (row.source as CalendarSource) ?? "adhoc",
    clientUserId: (row.client_user_id as string | null) ?? null,
    teamId: (row.team_id as string | null) ?? null,
    programAssignmentId: (row.program_assignment_id as string | null) ?? null,
  };
}

export function mapCompletionRow(row: Record<string, unknown>): WorkoutCompletion {
  return {
    id: String(row.id),
    calendarEntryId: String(row.calendar_entry_id),
    clientUserId: String(row.client_user_id),
    completedAt: String(row.completed_at ?? new Date().toISOString()),
    clientNote: String(row.client_note ?? ""),
  };
}

export function mapSetLogRow(row: Record<string, unknown>): WorkoutSetLog {
  return {
    id: String(row.id),
    calendarEntryId: String(row.calendar_entry_id),
    clientUserId: String(row.client_user_id),
    workoutBlockId: String(row.workout_block_id),
    exerciseId: String(row.exercise_id),
    setNumber: Number(row.set_number),
    targetReps: row.target_reps == null ? null : Number(row.target_reps),
    reps: row.reps == null ? null : Number(row.reps),
    weightLb: row.weight_lb == null ? null : Number(row.weight_lb),
    loggedAt: String(row.logged_at ?? new Date().toISOString()),
  };
}

export async function loadProgramsStateFromSupabase(
  supabase: DbClient,
  options?: { tenantId?: string },
): Promise<ProgramsState> {
  const tenantId = options?.tenantId;
  const from = (table: string) => {
    let q = supabase.from(table).select("*");
    if (tenantId) q = q.eq("tenant_id", tenantId);
    return q;
  };

  const [
    exercisesRes,
    workoutsRes,
    blocksRes,
    setsRes,
    programsRes,
    daysRes,
    teamsRes,
    membersRes,
    assignmentsRes,
    calendarRes,
    completionsRes,
  ] = await Promise.all([
    from(MA5_TABLES.exercises).order("created_at", { ascending: false }),
    from(MA5_TABLES.workouts).order("created_at", { ascending: false }),
    supabase.from(MA5_TABLES.workoutBlocks).select("*").order("sort_order", { ascending: true }),
    supabase.from(MA5_TABLES.workoutBlockSets).select("*").order("set_number", { ascending: true }),
    from(MA5_TABLES.programs).order("created_at", { ascending: false }),
    supabase.from(MA5_TABLES.programDays).select("*"),
    from(MA5_TABLES.teams).order("created_at", { ascending: false }),
    supabase.from(MA5_TABLES.teamMembers).select("*"),
    from(MA5_TABLES.programAssignments).order("created_at", { ascending: false }),
    from(MA5_TABLES.calendarEntries).order("entry_date", { ascending: true }),
    from(MA5_TABLES.workoutCompletions).select("*"),
  ]);

  const firstError =
    exercisesRes.error ||
    workoutsRes.error ||
    blocksRes.error ||
    setsRes.error ||
    programsRes.error ||
    daysRes.error ||
    teamsRes.error ||
    membersRes.error ||
    assignmentsRes.error ||
    calendarRes.error ||
    completionsRes.error;
  if (firstError) {
    throw new Error(firstError.message);
  }

  const setsByBlock = new Map<string, WorkoutBlockSet[]>();
  for (const row of setsRes.data ?? []) {
    const blockId = String(row.block_id);
    const list = setsByBlock.get(blockId) ?? [];
    list.push({
      setNumber: Number(row.set_number),
      reps: row.reps == null ? null : Number(row.reps),
      weightLb: row.weight_lb == null ? null : Number(row.weight_lb),
    });
    setsByBlock.set(blockId, list);
  }

  const workoutBlocks: WorkoutBlock[] = (blocksRes.data ?? []).map((row) => ({
    id: String(row.id),
    workoutId: String(row.workout_id),
    sortOrder: Number(row.sort_order ?? 0),
    label: String(row.label ?? "A"),
    sectionTitle: (row.section_title as string | null) ?? null,
    exerciseId: String(row.exercise_id),
    sessionCues: String(row.session_cues ?? ""),
    sets: setsByBlock.get(String(row.id)) ?? [],
  }));

  const memberUserIds = [
    ...new Set((membersRes.data ?? []).map((m) => String(m.user_id))),
  ];
  const nameByUserId = new Map<string, string>();
  if (memberUserIds.length > 0) {
    let profileQuery = supabase
      .from(MA5_TABLES.profiles)
      .select("id, full_name, email")
      .in("id", memberUserIds);
    if (tenantId) profileQuery = profileQuery.eq("tenant_id", tenantId);
    const { data: profiles } = await profileQuery;
    for (const p of profiles ?? []) {
      nameByUserId.set(
        String(p.id),
        (p.full_name as string | null)?.trim() ||
          (p.email as string | null) ||
          "Athlete",
      );
    }
  }

  const teamMembers: TeamMember[] = (membersRes.data ?? []).map((row) => {
    const userId = String(row.user_id);
    return {
      id: String(row.id),
      teamId: String(row.team_id),
      userId,
      userName: nameByUserId.get(userId) ?? "Athlete",
      joinedAt: String(row.joined_at ?? new Date().toISOString()),
    };
  });

  return {
    exercises: (exercisesRes.data ?? []).map((r) =>
      mapExerciseRow(r as Record<string, unknown>),
    ),
    workouts: (workoutsRes.data ?? []).map((r) =>
      mapWorkoutRow(r as Record<string, unknown>),
    ),
    workoutBlocks,
    programs: (programsRes.data ?? []).map((r) =>
      mapProgramRow(r as Record<string, unknown>),
    ),
    programDays: (daysRes.data ?? []).map((r) =>
      mapProgramDayRow(r as Record<string, unknown>),
    ),
    teams: (teamsRes.data ?? []).map((r) =>
      mapTeamRow(r as Record<string, unknown>),
    ),
    teamMembers,
    assignments: (assignmentsRes.data ?? []).map((r) =>
      mapAssignmentRow(r as Record<string, unknown>),
    ),
    calendarEntries: (calendarRes.data ?? []).map((r) =>
      mapCalendarRow(r as Record<string, unknown>),
    ),
    completions: (completionsRes.data ?? []).map((r) =>
      mapCompletionRow(r as Record<string, unknown>),
    ),
    setLogs: [],
  };
}

export async function replaceBlockSets(
  supabase: DbClient,
  blockId: string,
  sets: WorkoutBlockSet[],
) {
  const { error: delError } = await supabase
    .from(MA5_TABLES.workoutBlockSets)
    .delete()
    .eq("block_id", blockId);
  if (delError) throw new Error(delError.message);

  if (sets.length === 0) return;

  const { error: insError } = await supabase
    .from(MA5_TABLES.workoutBlockSets)
    .insert(
      sets.map((s) => ({
        block_id: blockId,
        set_number: s.setNumber,
        reps: s.reps,
        weight_lb: s.weightLb,
      })),
    );
  if (insError) throw new Error(insError.message);
}

export async function materializeProgramDaysToDb(input: {
  supabase: DbClient;
  programId: string;
  startDate: string;
  clientUserId?: string | null;
  teamId?: string | null;
  assignmentId: string;
  publish?: boolean;
  programDays: ProgramDay[];
  workoutsById: Map<string, Workout>;
  ctx?: Ma5DeploymentContext | null;
}): Promise<CalendarEntry[]> {
  const days = input.programDays.filter(
    (d) => d.programId === input.programId && d.workoutId,
  );
  const rows = days.map((day) => {
    const offset = (day.weekIndex - 1) * 7 + (day.dayIndex - 1);
    const workout = day.workoutId
      ? input.workoutsById.get(day.workoutId)
      : null;
    const base = {
      entry_date: addDaysIso(input.startDate, offset),
      workout_id: day.workoutId,
      title: workout?.title ?? "Workout",
      publish_status: input.publish ? "published" : "draft",
      source: "program",
      client_user_id: input.clientUserId ?? null,
      team_id: input.teamId ?? null,
      program_assignment_id: input.assignmentId,
    };
    return input.ctx ? withTenantId(input.ctx, base) : base;
  });

  if (rows.length === 0) return [];

  const { data, error } = await input.supabase
    .from(MA5_TABLES.calendarEntries)
    .insert(rows)
    .select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapCalendarRow(r as Record<string, unknown>));
}
