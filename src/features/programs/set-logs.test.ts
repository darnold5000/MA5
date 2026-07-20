import { describe, expect, it } from "vitest";

import {
  buildLastPerformanceMap,
  formatLastPerformanceLabel,
  performanceKey,
  resolveAutofillWeight,
} from "@/features/programs/set-logs";
import type { WorkoutSetLog } from "@/features/programs/types";

function log(partial: Partial<WorkoutSetLog> & Pick<WorkoutSetLog, "id">): WorkoutSetLog {
  return {
    calendarEntryId: "cal-1",
    clientUserId: "user-1",
    workoutBlockId: "block-1",
    exerciseId: "ex-1",
    setNumber: 1,
    targetReps: 5,
    reps: 5,
    weightLb: 135,
    loggedAt: "2026-07-01T12:00:00.000Z",
    ...partial,
  };
}

describe("performanceKey", () => {
  it("keys by exercise and target reps", () => {
    expect(performanceKey("ex-1", 5)).toBe("ex-1:5");
    expect(performanceKey("ex-1", null)).toBe("ex-1:any");
  });
});

describe("buildLastPerformanceMap", () => {
  it("returns the newest weight per exercise/rep scheme", () => {
    const map = buildLastPerformanceMap([
      log({ id: "a", weightLb: 125, loggedAt: "2026-07-01T12:00:00.000Z" }),
      log({ id: "b", weightLb: 135, loggedAt: "2026-07-10T12:00:00.000Z" }),
      log({
        id: "c",
        exerciseId: "ex-2",
        targetReps: 8,
        weightLb: 95,
        loggedAt: "2026-07-05T12:00:00.000Z",
      }),
    ]);

    expect(map[performanceKey("ex-1", 5)]?.weightLb).toBe(135);
    expect(map[performanceKey("ex-2", 8)]?.weightLb).toBe(95);
  });

  it("excludes the current calendar entry when requested", () => {
    const map = buildLastPerformanceMap(
      [
        log({
          id: "a",
          calendarEntryId: "cal-current",
          weightLb: 145,
          loggedAt: "2026-07-15T12:00:00.000Z",
        }),
        log({
          id: "b",
          calendarEntryId: "cal-old",
          weightLb: 135,
          loggedAt: "2026-07-10T12:00:00.000Z",
        }),
      ],
      { excludeCalendarEntryId: "cal-current" },
    );

    expect(map[performanceKey("ex-1", 5)]?.weightLb).toBe(135);
  });
});

describe("resolveAutofillWeight", () => {
  it("prefers an existing session log over history", () => {
    expect(
      resolveAutofillWeight({
        existingLog: log({ id: "a", weightLb: 155 }),
        lastPerformance: {
          exerciseId: "ex-1",
          targetReps: 5,
          weightLb: 135,
          loggedAt: "2026-07-01T12:00:00.000Z",
        },
      }),
    ).toBe(155);
  });

  it("falls back to last performance", () => {
    expect(
      resolveAutofillWeight({
        existingLog: null,
        lastPerformance: {
          exerciseId: "ex-1",
          targetReps: 5,
          weightLb: 135,
          loggedAt: "2026-07-01T12:00:00.000Z",
        },
      }),
    ).toBe(135);
  });
});

describe("formatLastPerformanceLabel", () => {
  it("formats weight, reps, and date", () => {
    const label = formatLastPerformanceLabel({
      exerciseId: "ex-1",
      targetReps: 5,
      weightLb: 135,
      loggedAt: "2026-07-10T12:00:00.000Z",
    });
    expect(label).toContain("135 lb");
    expect(label).toContain("5 reps");
  });
});
