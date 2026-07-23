import { mergeExerciseLibrary } from "@/features/programs/exercise-library";
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
  setLogs: WorkoutSetLog[];
};

/** Truly empty programs state — no seeded workouts or demo clients. */
export function emptyProgramsState(): ProgramsState {
  return {
    exercises: mergeExerciseLibrary([]),
    workouts: [],
    workoutBlocks: [],
    programs: [],
    programDays: [],
    teams: [],
    teamMembers: [],
    assignments: [],
    calendarEntries: [],
    completions: [],
    setLogs: [],
  };
}

export function addDaysIso(startDate: string, dayOffset: number): string {
  const d = new Date(`${startDate}T12:00:00`);
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().slice(0, 10);
}
