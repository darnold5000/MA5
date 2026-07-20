import type { LastPerformance, WorkoutSetLog } from "@/features/programs/types";

export function performanceKey(
  exerciseId: string,
  targetReps: number | null,
): string {
  return `${exerciseId}:${targetReps ?? "any"}`;
}

/** Most recent logged weight per exercise + rep scheme (excludes current session). */
export function buildLastPerformanceMap(
  logs: WorkoutSetLog[],
  options?: { excludeCalendarEntryId?: string },
): Record<string, LastPerformance> {
  const excludeId = options?.excludeCalendarEntryId;
  const sorted = [...logs]
    .filter((log) => log.weightLb != null)
    .filter((log) => !excludeId || log.calendarEntryId !== excludeId)
    .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));

  const map: Record<string, LastPerformance> = {};
  for (const log of sorted) {
    const key = performanceKey(log.exerciseId, log.targetReps);
    if (map[key]) continue;
    map[key] = {
      exerciseId: log.exerciseId,
      targetReps: log.targetReps,
      weightLb: log.weightLb!,
      loggedAt: log.loggedAt,
    };
  }
  return map;
}

export function getSetLogForBlock(
  logs: WorkoutSetLog[],
  blockId: string,
  setNumber: number,
): WorkoutSetLog | null {
  return (
    logs.find(
      (log) => log.workoutBlockId === blockId && log.setNumber === setNumber,
    ) ?? null
  );
}

export function resolveAutofillWeight(input: {
  existingLog: WorkoutSetLog | null;
  lastPerformance: LastPerformance | null;
}): number | null {
  if (input.existingLog?.weightLb != null) {
    return input.existingLog.weightLb;
  }
  return input.lastPerformance?.weightLb ?? null;
}

export function formatLastPerformanceLabel(
  last: LastPerformance | null,
): string | null {
  if (!last) return null;
  const date = new Date(last.loggedAt);
  const dateLabel = Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const repsLabel =
    last.targetReps != null ? `${last.targetReps} reps` : "last session";
  return dateLabel
    ? `${last.weightLb} lb · ${repsLabel} · ${dateLabel}`
    : `${last.weightLb} lb · ${repsLabel}`;
}
