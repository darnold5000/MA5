import { cookies } from "next/headers";

import {
  addDaysIso,
  emptyProgramsState,
  type ProgramsState,
} from "@/features/programs/state";
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
  WorkoutSetLog,
} from "@/features/programs/types";
import { allowDemoFallbacks } from "@/lib/tenant/runtime-data";

export const PROGRAMS_COOKIE = "ma5_programs";

export type { ProgramsState } from "@/features/programs/state";
export { addDaysIso, emptyProgramsState } from "@/features/programs/state";

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function daysOffsetIso(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function seedState(): ProgramsState {
  const now = new Date().toISOString();
  const exercises = mergeExerciseLibrary([]);

  const exBackSquat = libraryExerciseId("Legs", "Back Squat");
  const exDeadlift = libraryExerciseId("Legs", "Conventional Deadlift");
  const exPullup = libraryExerciseId("Back", "Pull-Up");
  const exFrontSquat = libraryExerciseId("Legs", "Front Squat");

  const upperId = "wo_upper_1";
  const lowerId = "wo_lower_1";
  const speedId = "wo_speed_1";
  const rehabId = "wo_rehab_1";

  const workouts: Workout[] = [
    {
      id: upperId,
      title: "Upper Body Strength",
      coachInstructions:
        "Warm up well. Leave 1–2 reps in the tank on primary lifts.",
      createdAt: now,
    },
    {
      id: lowerId,
      title: "Lower Body Strength",
      coachInstructions: "Focus on depth and control. No grinding reps.",
      createdAt: now,
    },
    {
      id: speedId,
      title: "Speed & Agility",
      coachInstructions: "Quality over quantity. Full recovery between efforts.",
      createdAt: now,
    },
    {
      id: rehabId,
      title: "Rehab Mobility",
      coachInstructions: "Pain-free range only. Stop if irritation increases.",
      createdAt: now,
    },
  ];

  const blocks: WorkoutBlock[] = [
    {
      id: "wb_a",
      workoutId: upperId,
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
      workoutId: upperId,
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
      workoutId: upperId,
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
    {
      id: "wb_lower_a",
      workoutId: lowerId,
      sortOrder: 0,
      label: "A",
      sectionTitle: "Primary",
      exerciseId: exDeadlift,
      sessionCues: "Brace hard.",
      sets: [
        { setNumber: 1, reps: 5, weightLb: null },
        { setNumber: 2, reps: 5, weightLb: null },
        { setNumber: 3, reps: 5, weightLb: null },
      ],
    },
    {
      id: "wb_speed_a",
      workoutId: speedId,
      sortOrder: 0,
      label: "A",
      sectionTitle: "Linear speed",
      exerciseId: exPullup,
      sessionCues: "Explosive intent.",
      sets: [
        { setNumber: 1, reps: 6, weightLb: null },
        { setNumber: 2, reps: 6, weightLb: null },
      ],
    },
    {
      id: "wb_rehab_a",
      workoutId: rehabId,
      sortOrder: 0,
      label: "A",
      sectionTitle: "Mobility",
      exerciseId: exBackSquat,
      sessionCues: "Easy tempo.",
      sets: [
        { setNumber: 1, reps: 10, weightLb: null },
        { setNumber: 2, reps: 10, weightLb: null },
      ],
    },
  ];

  const foundationsId = "prog_foundations";
  const speedProgId = "prog_speed";
  const rehabProgId = "prog_rehab";

  const programs: Program[] = [
    {
      id: foundationsId,
      title: "Strength Foundations",
      weeks: 8,
      createdAt: now,
    },
    {
      id: speedProgId,
      title: "Speed Program",
      weeks: 6,
      createdAt: now,
    },
    {
      id: rehabProgId,
      title: "Rehab",
      weeks: 4,
      createdAt: now,
    },
  ];

  const programDays: ProgramDay[] = [
    {
      id: "pd_w1d1",
      programId: foundationsId,
      weekIndex: 1,
      dayIndex: 1,
      workoutId: upperId,
    },
    {
      id: "pd_w1d3",
      programId: foundationsId,
      weekIndex: 1,
      dayIndex: 3,
      workoutId: lowerId,
    },
    {
      id: "pd_speed_1",
      programId: speedProgId,
      weekIndex: 1,
      dayIndex: 1,
      workoutId: speedId,
    },
    {
      id: "pd_rehab_1",
      programId: rehabProgId,
      weekIndex: 1,
      dayIndex: 1,
      workoutId: rehabId,
    },
  ];

  const teamId = "team_performance";
  const team: Team = {
    id: teamId,
    name: "Small Group AM",
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
    {
      id: "tm_jordan",
      teamId,
      userId: "client-jordan",
      userName: "Jordan Lee",
      joinedAt: now,
    },
  ];

  const assignAlex = "asgn_alex_foundations";
  const assignJordan = "asgn_jordan_speed";
  const assignSam = "asgn_sam_rehab";
  const assignEmily = "asgn_emily_foundations";

  const assignments: ProgramAssignment[] = [
    {
      id: assignAlex,
      programId: foundationsId,
      clientUserId: "client-alex",
      teamId: null,
      startDate: daysOffsetIso(-21),
      status: "active",
    },
    {
      id: assignJordan,
      programId: speedProgId,
      clientUserId: "client-jordan",
      teamId: null,
      startDate: daysOffsetIso(-14),
      status: "active",
    },
    {
      id: assignSam,
      programId: rehabProgId,
      clientUserId: "client-sam",
      teamId: null,
      // 4-week program started ~3 weeks ago → expires next week
      startDate: daysOffsetIso(-21),
      status: "active",
    },
    {
      id: assignEmily,
      programId: foundationsId,
      clientUserId: "client-emily",
      teamId: null,
      startDate: daysOffsetIso(-56),
      status: "completed",
    },
  ];

  /** Alex: ~18 of 24 style progress — rich history + today */
  const alexHistory: Array<{
    id: string;
    offset: number;
    workoutId: string;
    title: string;
    completed: boolean;
  }> = [
    { id: "cal_alex_m18", offset: -18, workoutId: upperId, title: "Upper Body Strength", completed: true },
    { id: "cal_alex_m16", offset: -16, workoutId: lowerId, title: "Lower Body Strength", completed: true },
    { id: "cal_alex_m14", offset: -14, workoutId: upperId, title: "Upper Body Strength", completed: true },
    { id: "cal_alex_m12", offset: -12, workoutId: lowerId, title: "Lower Body Strength", completed: true },
    { id: "cal_alex_m10", offset: -10, workoutId: upperId, title: "Upper Body Strength", completed: true },
    { id: "cal_alex_m8", offset: -8, workoutId: lowerId, title: "Lower Body Strength", completed: true },
    { id: "cal_alex_m6", offset: -6, workoutId: upperId, title: "Upper Body Strength", completed: true },
    { id: "cal_alex_m4", offset: -4, workoutId: lowerId, title: "Lower Body Strength", completed: true },
    { id: "cal_alex_m3", offset: -3, workoutId: upperId, title: "Upper Body Strength", completed: true },
    { id: "cal_alex_m2", offset: -2, workoutId: lowerId, title: "Lower Body Strength", completed: true },
    { id: "cal_alex_m1", offset: -1, workoutId: upperId, title: "Upper Body Strength", completed: true },
    { id: "cal_alex_today", offset: 0, workoutId: upperId, title: "Upper Body Strength", completed: false },
    { id: "cal_alex_p2", offset: 2, workoutId: lowerId, title: "Lower Body Strength", completed: false },
    { id: "cal_alex_p4", offset: 4, workoutId: upperId, title: "Upper Body Strength", completed: false },
    { id: "cal_alex_p6", offset: 6, workoutId: lowerId, title: "Lower Body Strength", completed: false },
    { id: "cal_alex_p8", offset: 8, workoutId: upperId, title: "Upper Body Strength", completed: false },
    { id: "cal_alex_p10", offset: 10, workoutId: lowerId, title: "Lower Body Strength", completed: false },
  ];

  // Pad to 24 published workouts with earlier completed history
  const alexExtraCompleted = Array.from({ length: 7 }, (_, i) => ({
    id: `cal_alex_extra_${i}`,
    offset: -(20 + i * 2),
    workoutId: i % 2 === 0 ? upperId : lowerId,
    title: i % 2 === 0 ? "Upper Body Strength" : "Lower Body Strength",
    completed: true,
  }));

  const alexAll = [...alexExtraCompleted, ...alexHistory];

  const jordanHistory = [
    {
      id: "cal_jordan_m12",
      offset: -12,
      workoutId: speedId,
      title: "Speed & Agility",
      completed: true,
    },
    {
      id: "cal_jordan_m9",
      offset: -9,
      workoutId: speedId,
      title: "Speed & Agility",
      completed: true,
    },
    {
      id: "cal_jordan_m6",
      offset: -6,
      workoutId: speedId,
      title: "Speed & Agility",
      completed: true,
    },
    {
      id: "cal_jordan_p1",
      offset: 1,
      workoutId: speedId,
      title: "Speed & Agility",
      completed: false,
    },
    {
      id: "cal_jordan_p3",
      offset: 3,
      workoutId: speedId,
      title: "Speed & Agility",
      completed: false,
    },
    {
      id: "cal_jordan_p5",
      offset: 5,
      workoutId: speedId,
      title: "Speed & Agility",
      completed: false,
    },
    {
      id: "cal_jordan_p8",
      offset: 8,
      workoutId: speedId,
      title: "Speed & Agility",
      completed: false,
    },
  ];

  // Still training recently — attention is program end, not inactivity
  const samHistory = [
    {
      id: "cal_sam_m4",
      offset: -4,
      workoutId: rehabId,
      title: "Rehab Mobility",
      completed: true,
    },
    {
      id: "cal_sam_m2",
      offset: -2,
      workoutId: rehabId,
      title: "Rehab Mobility",
      completed: true,
    },
    {
      id: "cal_sam_p1",
      offset: 1,
      workoutId: rehabId,
      title: "Rehab Mobility",
      completed: false,
    },
    {
      id: "cal_sam_p3",
      offset: 3,
      workoutId: rehabId,
      title: "Rehab Mobility",
      completed: false,
    },
    {
      id: "cal_sam_p5",
      offset: 5,
      workoutId: rehabId,
      title: "Rehab Mobility",
      completed: false,
    },
  ];

  const emilyHistory = [
    {
      id: "cal_emily_1",
      offset: -28,
      workoutId: upperId,
      title: "Upper Body Strength",
      completed: true,
    },
    {
      id: "cal_emily_2",
      offset: -25,
      workoutId: lowerId,
      title: "Lower Body Strength",
      completed: true,
    },
    {
      id: "cal_emily_3",
      offset: -21,
      workoutId: upperId,
      title: "Upper Body Strength",
      completed: true,
    },
    {
      id: "cal_emily_4",
      offset: -18,
      workoutId: lowerId,
      title: "Lower Body Strength",
      completed: true,
    },
    {
      id: "cal_emily_5",
      offset: -14,
      workoutId: upperId,
      title: "Upper Body Strength",
      completed: true,
    },
    {
      id: "cal_emily_6",
      offset: -10,
      workoutId: lowerId,
      title: "Lower Body Strength",
      completed: true,
    },
  ];

  function toEntries(
    clientUserId: string,
    assignmentId: string,
    rows: Array<{
      id: string;
      offset: number;
      workoutId: string;
      title: string;
      completed: boolean;
    }>,
  ): { entries: CalendarEntry[]; completions: WorkoutCompletion[] } {
    const entries: CalendarEntry[] = [];
    const completions: WorkoutCompletion[] = [];
    for (const row of rows) {
      entries.push({
        id: row.id,
        entryDate: daysOffsetIso(row.offset),
        workoutId: row.workoutId,
        title: row.title,
        publishStatus: "published",
        source: "program",
        clientUserId,
        teamId: null,
        programAssignmentId: assignmentId,
      });
      if (row.completed) {
        completions.push({
          id: `comp_${row.id}`,
          calendarEntryId: row.id,
          clientUserId,
          completedAt: `${daysOffsetIso(row.offset)}T18:00:00.000Z`,
          clientNote: "",
        });
      }
    }
    return { entries, completions };
  }

  const alex = toEntries("client-alex", assignAlex, alexAll);
  const jordan = toEntries("client-jordan", assignJordan, jordanHistory);
  const sam = toEntries("client-sam", assignSam, samHistory);
  const emily = toEntries("client-emily", assignEmily, emilyHistory);

  const teamTomorrow: CalendarEntry = {
    id: "cal_team_tomorrow",
    entryDate: daysOffsetIso(1),
    workoutId: upperId,
    title: "Upper Body Strength",
    publishStatus: "published",
    source: "library",
    clientUserId: null,
    teamId,
    programAssignmentId: null,
  };

  return {
    exercises,
    workouts,
    workoutBlocks: blocks,
    programs,
    programDays,
    teams: [team],
    teamMembers,
    assignments,
    calendarEntries: [
      ...alex.entries,
      ...jordan.entries,
      ...sam.entries,
      ...emily.entries,
      teamTomorrow,
    ],
    completions: [
      ...alex.completions,
      ...jordan.completions,
      ...sam.completions,
      ...emily.completions,
    ],
    setLogs: seedDemoSetLogs({
      exBackSquat,
      exFrontSquat,
      blockId: "wb_a",
    }),
  };
}

function seedDemoSetLogs(input: {
  exBackSquat: string;
  exFrontSquat: string;
  blockId: string;
}): WorkoutSetLog[] {
  const sessions = [
    { entryId: "cal_alex_m18", offset: -18, back: 135, front: 75 },
    { entryId: "cal_alex_m12", offset: -12, back: 145, front: 80 },
    { entryId: "cal_alex_m6", offset: -6, back: 155, front: 90 },
    { entryId: "cal_alex_m2", offset: -2, back: 165, front: 95 },
  ];
  const logs: WorkoutSetLog[] = [];
  let n = 0;
  for (const session of sessions) {
    const loggedAt = `${daysOffsetIso(session.offset)}T18:00:00.000Z`;
    for (const [setNumber, bump] of [
      [1, 0],
      [2, 5],
      [3, 10],
    ] as const) {
      n += 1;
      logs.push({
        id: `setlog_back_${n}`,
        calendarEntryId: session.entryId,
        clientUserId: "client-alex",
        workoutBlockId: input.blockId,
        exerciseId: input.exBackSquat,
        setNumber,
        targetReps: 5,
        reps: 5,
        weightLb: session.back + bump,
        loggedAt,
      });
      logs.push({
        id: `setlog_front_${n}`,
        calendarEntryId: session.entryId,
        clientUserId: "client-alex",
        workoutBlockId: input.blockId,
        exerciseId: input.exFrontSquat,
        setNumber,
        targetReps: 10,
        reps: 10,
        weightLb: session.front + bump,
        loggedAt,
      });
    }
  }
  return logs;
}

export function parseProgramsState(raw: string | undefined): ProgramsState {
  if (!raw) return seedState();
  try {
    const parsed = JSON.parse(raw) as Partial<ProgramsState>;
    const base = seedState();
    const useSeedProgress =
      !Array.isArray(parsed.assignments) ||
      parsed.assignments.length === 0 ||
      !parsed.assignments.some((a) => a.clientUserId === "client-emily");
    return {
      exercises: mergeExerciseLibrary(parsed.exercises),
      workouts: Array.isArray(parsed.workouts) ? parsed.workouts : base.workouts,
      workoutBlocks: Array.isArray(parsed.workoutBlocks)
        ? parsed.workoutBlocks
        : base.workoutBlocks,
      programs: useSeedProgress
        ? base.programs
        : Array.isArray(parsed.programs)
          ? parsed.programs
          : base.programs,
      programDays: useSeedProgress
        ? base.programDays
        : Array.isArray(parsed.programDays)
          ? parsed.programDays
          : base.programDays,
      teams: Array.isArray(parsed.teams) ? parsed.teams : base.teams,
      teamMembers: Array.isArray(parsed.teamMembers)
        ? parsed.teamMembers
        : base.teamMembers,
      assignments: useSeedProgress
        ? base.assignments
        : parsed.assignments!,
      calendarEntries: useSeedProgress
        ? base.calendarEntries
        : Array.isArray(parsed.calendarEntries)
          ? parsed.calendarEntries
          : base.calendarEntries,
      completions: useSeedProgress
        ? base.completions
        : Array.isArray(parsed.completions)
          ? parsed.completions
          : base.completions,
      setLogs: Array.isArray(parsed.setLogs) ? parsed.setLogs : base.setLogs,
    };
  } catch {
    return seedState();
  }
}

export async function readProgramsState(): Promise<ProgramsState> {
  if (!allowDemoFallbacks()) return emptyProgramsState();
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
      publishStatus: (input.publish
        ? "published"
        : "draft") as CalendarEntry["publishStatus"],
      source: "program" as const,
      clientUserId: input.clientUserId ?? null,
      teamId: input.teamId ?? null,
      programAssignmentId: input.assignmentId,
    };
  });
}
