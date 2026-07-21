import type { Exercise, WorkoutSetLog } from "@/features/programs/types";

/** Epley estimate: weight * (1 + reps/30). Uses best set that day. */
export function estimateOneRepMax(weightLb: number, reps: number): number {
  const r = Math.max(1, reps);
  if (r === 1) return weightLb;
  return Math.round(weightLb * (1 + r / 30));
}

export type ExerciseSessionPoint = {
  date: string;
  dateLabel: string;
  maxWeightLb: number;
  totalVolumeLb: number;
  totalReps: number;
  estimated1Rm: number;
};

export type ExerciseHistorySummary = {
  exerciseId: string;
  exerciseTitle: string;
  sessions: ExerciseSessionPoint[];
  estimated1Rm: number;
  progressPercent: number;
  totalVolumeLb: number;
  totalReps: number;
  avgWeightLb: number;
  maxWeightLb: number;
};

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

function formatShortDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, { month: "numeric", day: "numeric" });
}

export function buildExerciseHistory(
  logs: WorkoutSetLog[],
  exercises: Exercise[],
): ExerciseHistorySummary[] {
  const weighted = logs.filter(
    (log) => log.weightLb != null && log.weightLb > 0,
  );
  if (weighted.length === 0) return [];

  const byExercise = new Map<string, WorkoutSetLog[]>();
  for (const log of weighted) {
    const list = byExercise.get(log.exerciseId) ?? [];
    list.push(log);
    byExercise.set(log.exerciseId, list);
  }

  const titleMap = new Map(exercises.map((e) => [e.id, e.title]));
  const summaries: ExerciseHistorySummary[] = [];

  for (const [exerciseId, exerciseLogs] of byExercise) {
    const byDay = new Map<string, WorkoutSetLog[]>();
    for (const log of exerciseLogs) {
      const key = dateKey(log.loggedAt);
      const list = byDay.get(key) ?? [];
      list.push(log);
      byDay.set(key, list);
    }

    const sessions: ExerciseSessionPoint[] = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayLogs]) => {
        let maxWeight = 0;
        let totalVolume = 0;
        let totalReps = 0;
        let best1Rm = 0;
        for (const log of dayLogs) {
          const w = log.weightLb ?? 0;
          const reps = log.reps ?? log.targetReps ?? 1;
          maxWeight = Math.max(maxWeight, w);
          totalVolume += w * reps;
          totalReps += reps;
          best1Rm = Math.max(best1Rm, estimateOneRepMax(w, reps));
        }
        return {
          date,
          dateLabel: formatShortDate(date),
          maxWeightLb: maxWeight,
          totalVolumeLb: Math.round(totalVolume),
          totalReps,
          estimated1Rm: best1Rm,
        };
      });

    if (sessions.length === 0) continue;

    const first = sessions[0]!;
    const last = sessions[sessions.length - 1]!;
    const progressPercent =
      first.maxWeightLb > 0
        ? Math.round(
            ((last.maxWeightLb - first.maxWeightLb) / first.maxWeightLb) * 100,
          )
        : 0;

    const totalVolumeLb = sessions.reduce((s, p) => s + p.totalVolumeLb, 0);
    const totalReps = sessions.reduce((s, p) => s + p.totalReps, 0);
    const maxWeightLb = Math.max(...sessions.map((p) => p.maxWeightLb));
    const weightSamples = exerciseLogs.map((l) => l.weightLb!).filter(Boolean);
    const avgWeightLb =
      weightSamples.length > 0
        ? Math.round(
            (weightSamples.reduce((a, b) => a + b, 0) / weightSamples.length) *
              10,
          ) / 10
        : 0;

    summaries.push({
      exerciseId,
      exerciseTitle: titleMap.get(exerciseId) ?? "Exercise",
      sessions,
      estimated1Rm: last.estimated1Rm,
      progressPercent,
      totalVolumeLb,
      totalReps,
      avgWeightLb,
      maxWeightLb,
    });
  }

  return summaries.sort((a, b) => {
    const aLast = a.sessions[a.sessions.length - 1]?.date ?? "";
    const bLast = b.sessions[b.sessions.length - 1]?.date ?? "";
    return bLast.localeCompare(aLast);
  });
}

export function formatVolume(lbs: number): string {
  if (lbs >= 1000) {
    const k = lbs / 1000;
    return `${k >= 10 ? Math.round(k) : Math.round(k * 10) / 10}K lbs`;
  }
  return `${Math.round(lbs)} lbs`;
}
