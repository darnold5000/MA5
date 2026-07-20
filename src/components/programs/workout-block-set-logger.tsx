"use client";

import { useCallback, useState } from "react";

import {
  formatLastPerformanceLabel,
  getSetLogForBlock,
  performanceKey,
  resolveAutofillWeight,
} from "@/features/programs/set-logs";
import type {
  ClientProgramDay,
  WorkoutBlock,
  WorkoutSetLog,
} from "@/features/programs/types";

type BlockLoggerProps = {
  day: ClientProgramDay;
  block: WorkoutBlock & { exercise: { id: string; title: string } | null };
  onLogSaved: (log: WorkoutSetLog) => void;
};

function parseWeightInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export function WorkoutBlockSetLogger({
  day,
  block,
  onLogSaved,
}: BlockLoggerProps) {
  const exerciseId = block.exercise?.id;
  const lastByKey = day.lastPerformanceByKey;
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function displayWeight(setNumber: number, targetReps: number | null): string {
    if (drafts[setNumber] !== undefined) return drafts[setNumber];
    const existing = getSetLogForBlock(day.setLogs, block.id, setNumber);
    const last =
      exerciseId != null
        ? lastByKey[performanceKey(exerciseId, targetReps)] ?? null
        : null;
    const autofill = resolveAutofillWeight({
      existingLog: existing,
      lastPerformance: last,
    });
    return autofill != null ? String(autofill) : "";
  }

  const saveSet = useCallback(
    async (setNumber: number, rawValue: string) => {
      if (!exerciseId) return;
      const prescribed = block.sets.find((s) => s.setNumber === setNumber);
      if (!prescribed) return;

      const weightLb = parseWeightInput(rawValue);
      const key = `${block.id}:${setNumber}`;
      setSavingKey(key);
      setError(null);

      const res = await fetch("/api/programs/set-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarEntryId: day.entry.id,
          workoutBlockId: block.id,
          exerciseId,
          setNumber,
          targetReps: prescribed.reps,
          reps: prescribed.reps,
          weightLb,
        }),
      });
      const data = await res.json();
      setSavingKey(null);
      if (!res.ok) {
        setError(data.error ?? "Could not save weight");
        return;
      }
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[setNumber];
        return next;
      });
      onLogSaved(data.log as WorkoutSetLog);
    },
    [block.id, block.sets, day.entry.id, exerciseId, onLogSaved],
  );

  if (block.sets.length === 0) return null;

  const blockLast =
    exerciseId != null && block.sets[0]
      ? lastByKey[performanceKey(exerciseId, block.sets[0].reps)] ?? null
      : null;
  const lastLabel = formatLastPerformanceLabel(blockLast);

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">
          Log your weights
        </p>
        {lastLabel ? (
          <p className="text-xs text-muted">Last: {lastLabel}</p>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs tracking-wide text-muted uppercase">
              <th className="py-2 pr-3 font-semibold">Set</th>
              <th className="py-2 pr-3 font-semibold">Reps</th>
              <th className="py-2 pr-3 font-semibold">Coach</th>
              <th className="py-2 font-semibold">Your weight (lb)</th>
            </tr>
          </thead>
          <tbody>
            {block.sets.map((set) => {
              const key = `${block.id}:${set.setNumber}`;
              const coachWeight =
                set.weightLb != null ? `${set.weightLb}` : "—";
              return (
                <tr key={set.setNumber} className="border-b border-border/60">
                  <td className="py-2 pr-3 font-medium">{set.setNumber}</td>
                  <td className="py-2 pr-3">{set.reps ?? "—"}</td>
                  <td className="py-2 pr-3 text-muted">{coachWeight}</td>
                  <td className="py-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={2.5}
                      value={displayWeight(set.setNumber, set.reps)}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [set.setNumber]: e.target.value,
                        }))
                      }
                      onBlur={(e) => void saveSet(set.setNumber, e.target.value)}
                      placeholder="lb"
                      className="w-24 border border-border bg-background px-2 py-1.5"
                      aria-label={`Set ${set.setNumber} weight`}
                    />
                    {savingKey === key ? (
                      <span className="ml-2 text-xs text-muted">Saving…</span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {error ? (
        <p className="text-sm text-brand" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
