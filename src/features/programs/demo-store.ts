import { cookies } from "next/headers";

import {
  dehydrateExercisesForCookie,
  libraryExerciseId,
  mergeExerciseLibrary,
} from "@/features/programs/exercise-library";
import type {
  CalendarEntry,
  Program,
  ProgramAssignment,
  ProgramDay,
  Team,
  TeamMember,
  Workout,
  WorkoutBlock,
  WorkoutCompletion,
} from "@/features/programs/types";

export const PROGRAMS_COOKIE = "ma5_programs";

export type ProgramsState = {
  exercises: ReturnType<typeof mergeExerciseLibrary>;
  workouts: Workout[];
  workoutBlocks: WorkoutBlock[];
  programs: Program[];
  programDays: ProgramDay[];
  teams: Team[];
  teamMembers: TeamMember[];
  assignments: ProgramAssignment[];
  calendarEntries: CalendarEntry[];
  completions: WorkoutCompletion[];
};

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function seedState(): ProgramsState {
  const now = new Date().toISOString();
  const exercises = mergeExerciseLibrary([]);

  const exBackSquat = libraryExerciseId("Legs", "Back Squat");
  const exDeadlift = libraryExerciseId("Legs", "Conventional Deadlift");
  const exPullup = libraryExerciseId("Back", "Pull-Up");

  const workoutId = "wo_upper_1";
  const workout: Workout = {
    id: workoutId,
    title: "Upper Body Strength",
    coachInstructions: "Warm up well. Leave 1–2 reps in the tank on primary lifts.",
    createdAt: now,
  };

  const blocks: WorkoutBlock[] = [
    {
      id: "wb_a",
      workoutId,
      sortOrder: 0,
      label: "A",
      sectionTitle: "Primary",
      exerciseId: exBackSquat,
      sessionCues: "Build to a solid working set.",
      sets: [
        { setNumber: 1, reps: 5, weightLb: null },
        { setNumber: 2, reps: 5, weightLb: null },
        { setNumber: 3, reps: 5, weightLb: null },
      ],
    },
    {
      id: "wb_b1",
      workoutId,
      sortOrder: 1,
      label: "B1",
      sectionTitle: "Superset",
      exerciseId: exDeadlift,
      sessionCues: "",
      sets: [
        { setNumber: 1, reps: 5, weightLb: null },
        { setNumber: 2, reps: 5, weightLb: null },
        { setNumber: 3, reps: 5, weightLb: null },
      ],
    },
    {
      id: "wb_b2",
      workoutId,
      sortOrder: 2,
      label: "B2",
      sectionTitle: "Superset",
      exerciseId: exPullup,
      sessionCues: "Strict if possible.",
      sets: [
        { setNumber: 1, reps: 8, weightLb: null },
        { setNumber: 2, reps: 8, weightLb: null },
        { setNumber: 3, reps: 8, weightLb: null },
      ],
    },
  ];

  const programId = "prog_foundations";
  const program: Program = {
    id: programId,
    title: "MA5 Foundations",
    weeks: 4,
    createdAt: now,
  };

  const programDays: ProgramDay[] = [
    {
      id: "pd_w1d1",
      programId,
      weekIndex: 1,
      dayIndex: 1,
      workoutId,
    },
    {
      id: "pd_w1d3",
      programId,
      weekIndex: 1,
      dayIndex: 3,
      workoutId,
    },
  ];

  const teamId = "team_performance";
  const team: Team = {
    id: teamId,
    name: "Performance Group",
    difficulty: "Intermediate",
    createdAt: now,
  };

  const teamMembers: TeamMember[] = [
    {
      id: "tm_alex",
      teamId,
      userId: "client-alex",
      userName: "Alex",
      joinedAt: now,
    },
  ];

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = tomorrow.toISOString().slice(0, 10);

  const calendarEntries: CalendarEntry[] = [
    {
      id: "cal_alex_today",
      entryDate: todayIso,
      workoutId,
      title: workout.title,
      publishStatus: "published",
      source: "library",
      clientUserId: "client-alex",
      teamId: null,
      programAssignmentId: null,
    },
    {
      id: "cal_team_tomorrow",
      entryDate: tomorrowIso,
      workoutId,
      title: workout.title,
      publishStatus: "published",
      source: "library",
      clientUserId: null,
      teamId,
      programAssignmentId: null,
    },
  ];

  return {
    exercises,
    workouts: [workout],
    workoutBlocks: blocks,
    programs: [program],
    programDays,
    teams: [team],
    teamMembers,
    assignments: [],
    calendarEntries,
    completions: [],
  };
}

export function emptyProgramsState(): ProgramsState {
  return seedState();
}

export function parseProgramsState(raw: string | undefined): ProgramsState {
  if (!raw) return emptyProgramsState();
  try {
    const parsed = JSON.parse(raw) as Partial<ProgramsState>;
    const base = emptyProgramsState();
    return {
      exercises: mergeExerciseLibrary(parsed.exercises),
      workouts: Array.isArray(parsed.workouts) ? parsed.workouts : base.workouts,
      workoutBlocks: Array.isArray(parsed.workoutBlocks)
        ? parsed.workoutBlocks
        : base.workoutBlocks,
      programs: Array.isArray(parsed.programs) ? parsed.programs : base.programs,
      programDays: Array.isArray(parsed.programDays)
        ? parsed.programDays
        : base.programDays,
      teams: Array.isArray(parsed.teams) ? parsed.teams : base.teams,
      teamMembers: Array.isArray(parsed.teamMembers)
        ? parsed.teamMembers
        : base.teamMembers,
      assignments: Array.isArray(parsed.assignments)
        ? parsed.assignments
        : base.assignments,
      calendarEntries: Array.isArray(parsed.calendarEntries)
        ? parsed.calendarEntries
        : base.calendarEntries,
      completions: Array.isArray(parsed.completions)
        ? parsed.completions
        : base.completions,
    };
  } catch {
    return emptyProgramsState();
  }
}

export async function readProgramsState(): Promise<ProgramsState> {
  const jar = await cookies();
  return parseProgramsState(jar.get(PROGRAMS_COOKIE)?.value);
}

export function serializeProgramsState(state: ProgramsState): string {
  return JSON.stringify({
    ...state,
    exercises: dehydrateExercisesForCookie(state.exercises),
  });
}

export function newId(prefix: string) {
  return id(prefix);
}

export function blockLabelForIndex(index: number): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (index < 26) return letters[index]!;
  return `X${index + 1}`;
}

export function addDaysIso(startDate: string, dayOffset: number): string {
  const d = new Date(`${startDate}T12:00:00`);
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().slice(0, 10);
}

/** Materialize program days onto a calendar starting at startDate (week1/day1 = startDate). */
export function materializeProgramDays(input: {
  state: ProgramsState;
  programId: string;
  startDate: string;
  clientUserId?: string | null;
  teamId?: string | null;
  assignmentId: string;
  publish?: boolean;
}): CalendarEntry[] {
  const days = input.state.programDays.filter(
    (d) => d.programId === input.programId && d.workoutId,
  );
  const workoutsById = new Map(input.state.workouts.map((w) => [w.id, w]));
  return days.map((day) => {
    const offset = (day.weekIndex - 1) * 7 + (day.dayIndex - 1);
    const workout = day.workoutId ? workoutsById.get(day.workoutId) : null;
    return {
      id: newId("cal"),
      entryDate: addDaysIso(input.startDate, offset),
      workoutId: day.workoutId,
      title: workout?.title ?? "Workout",
      publishStatus: (input.publish ? "published" : "draft") as CalendarEntry["publishStatus"],
      source: "program" as const,
      clientUserId: input.clientUserId ?? null,
      teamId: input.teamId ?? null,
      programAssignmentId: input.assignmentId,
    };
  });
}
