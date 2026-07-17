export type TrainingEngagementStatus = "active" | "watch" | "stale";

/** Client-facing training summary (Programs hub). */
export type ClientTrainingProgress = {
  programId: string | null;
  programTitle: string | null;
  programWeeks: number | null;
  /** e.g. "Week 3 of 8" when week data is available */
  weekLabel: string | null;
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  todayWorkout: {
    entryId: string;
    title: string;
    completed: boolean;
  } | null;
  lastWorkout: {
    entryId: string;
    title: string;
    dateLabel: string;
    completed: boolean;
  } | null;
  streakDays: number;
  history: Array<{
    entryId: string;
    title: string;
    dateLabel: string;
    completed: boolean;
  }>;
};

/** Coach-facing row — same underlying progress, aggregated by client. */
export type CoachClientProgressRow = {
  clientId: string;
  clientName: string;
  programTitle: string | null;
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  lastWorkoutLabel: string;
  status: TrainingEngagementStatus;
  statusLabel: string;
};

export type CoachAttentionKind =
  | "inactive"
  | "program_complete"
  | "program_ending"
  | "no_program"
  | "membership_ending";

/** Simple coach nudges — no AI, just useful automatic surfacing. */
export type CoachAttentionAlert = {
  id: string;
  clientId: string;
  clientName: string;
  kind: CoachAttentionKind;
  reason: string;
  href: string;
};
