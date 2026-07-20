export type VideoSource = "upload" | "youtube" | "vimeo" | "none";
export type ExerciseParam = "reps" | "weight_lb";
export type PublishStatus = "draft" | "published";
export type CalendarSource = "program" | "library" | "adhoc";
export type AssignmentStatus = "draft" | "active" | "completed";

export type ExerciseCategory =
  | "Chest"
  | "Back"
  | "Shoulders"
  | "Legs"
  | "Hamstrings / Glutes"
  | "Arms"
  | "Core"
  | "Plyometrics"
  | "Speed & Agility"
  | "Olympic Lifts"
  | "Conditioning"
  | "Mobility"
  | "Recovery";

export type Exercise = {
  id: string;
  title: string;
  category: ExerciseCategory;
  pointsOfPerformance: string;
  videoSource: VideoSource;
  videoUrl: string | null;
  videoStoragePath: string | null;
  /** Resolved signed playback URL for uploaded videos (server-filled). */
  demoPlaybackUrl: string | null;
  defaultParam1: ExerciseParam;
  defaultParam2: ExerciseParam;
  createdAt: string;
};

export type WorkoutBlockSet = {
  setNumber: number;
  reps: number | null;
  weightLb: number | null;
};

export type WorkoutBlock = {
  id: string;
  workoutId: string;
  sortOrder: number;
  label: string;
  sectionTitle: string | null;
  exerciseId: string;
  sessionCues: string;
  sets: WorkoutBlockSet[];
};

export type Workout = {
  id: string;
  title: string;
  coachInstructions: string;
  createdAt: string;
};

export type Program = {
  id: string;
  title: string;
  weeks: number;
  createdAt: string;
};

export type ProgramDay = {
  id: string;
  programId: string;
  weekIndex: number;
  dayIndex: number;
  workoutId: string | null;
};

export type Team = {
  id: string;
  name: string;
  difficulty: string | null;
  createdAt: string;
};

export type TeamMember = {
  id: string;
  teamId: string;
  /** Matches StaffClient.id in demo, or profile id in DB */
  userId: string;
  userName: string;
  joinedAt: string;
};

export type ProgramAssignment = {
  id: string;
  programId: string | null;
  clientUserId: string | null;
  teamId: string | null;
  startDate: string;
  status: AssignmentStatus;
};

export type CalendarEntry = {
  id: string;
  entryDate: string;
  workoutId: string | null;
  title: string;
  publishStatus: PublishStatus;
  source: CalendarSource;
  clientUserId: string | null;
  teamId: string | null;
  programAssignmentId: string | null;
};

export type WorkoutCompletion = {
  id: string;
  calendarEntryId: string;
  clientUserId: string;
  completedAt: string;
  clientNote: string;
};

export type WorkoutSetLog = {
  id: string;
  calendarEntryId: string;
  clientUserId: string;
  workoutBlockId: string;
  exerciseId: string;
  setNumber: number;
  targetReps: number | null;
  reps: number | null;
  weightLb: number | null;
  loggedAt: string;
};

export type LastPerformance = {
  exerciseId: string;
  targetReps: number | null;
  weightLb: number;
  loggedAt: string;
};

export type CoachWorkoutReview = {
  entry: CalendarEntry;
  workout: WorkoutDetail | null;
  completion: WorkoutCompletion | null;
  setLogs: WorkoutSetLog[];
  clientName: string;
};

export type CoachTeamMemberWorkoutPerformance = {
  clientUserId: string;
  clientName: string;
  completion: WorkoutCompletion | null;
  setLogs: WorkoutSetLog[];
};

export type CoachTeamWorkoutReview = {
  entry: CalendarEntry;
  team: Team;
  workout: WorkoutDetail | null;
  members: CoachTeamMemberWorkoutPerformance[];
};

export type WorkoutDetail = Workout & {
  blocks: Array<
    WorkoutBlock & {
      exercise: Exercise | null;
    }
  >;
};

export type ClientProgramDay = {
  entry: CalendarEntry;
  workout: WorkoutDetail | null;
  completed: boolean;
  completion: WorkoutCompletion | null;
  sourceLabel: string;
  setLogs: WorkoutSetLog[];
  lastPerformanceByKey: Record<string, LastPerformance>;
};

export type {
  ClientTrainingProgress,
  CoachAttentionAlert,
  CoachAttentionKind,
  CoachClientProgressRow,
  TrainingEngagementStatus,
} from "./progress-types";
