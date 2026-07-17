"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Program, ProgramDay, Workout } from "@/features/programs/types";

type Props = {
  programs: Program[];
  programDays: ProgramDay[];
  workouts: Workout[];
};

export function ProgramGridManager({
  programs,
  programDays,
  workouts,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    programs[0]?.id ?? null,
  );
  const [title, setTitle] = useState("");
  const [weeks, setWeeks] = useState(4);

  const selected = programs.find((p) => p.id === selectedId) ?? null;
  const days = useMemo(
    () => programDays.filter((d) => d.programId === selectedId),
    [programDays, selectedId],
  );

  async function post(body: unknown) {
    setPending(true);
    setError(null);
    const res = await fetch("/api/admin/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Request failed");
      return null;
    }
    router.refresh();
    return data;
  }

  function dayCell(weekIndex: number, dayIndex: number) {
    return days.find(
      (d) => d.weekIndex === weekIndex && d.dayIndex === dayIndex,
    );
  }

  return (
    <div className="space-y-6">
      <div className="th-card p-5">
        <h2 className="text-lg font-bold">
          Create program
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <label className="space-y-1 text-sm">
            <span className="text-xs font-semibold tracking-wide uppercase">
              Name
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={75}
              className="min-h-11 w-64 border border-[var(--th-border)] bg-white px-3"
              placeholder="Olympic Lifting"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-semibold tracking-wide uppercase">
              Weeks
            </span>
            <input
              type="number"
              min={1}
              max={52}
              value={weeks}
              onChange={(e) => setWeeks(Number(e.target.value) || 1)}
              className="min-h-11 w-24 border border-[var(--th-border)] bg-white px-3"
            />
          </label>
          <button
            type="button"
            disabled={pending || !title.trim()}
            onClick={async () => {
              const data = await post({
                action: "createProgram",
                title,
                weeks,
              });
              if (data?.program) {
                setSelectedId(data.program.id);
                setTitle("");
              }
            }}
            className="mt-5 inline-flex min-h-11 items-center bg-brand px-5 text-xs font-semibold tracking-wide text-[var(--th-blue)]-foreground uppercase disabled:opacity-50"
          >
            Create program
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {programs.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelectedId(p.id)}
            className={`border px-3 py-2 text-xs font-semibold tracking-wide uppercase ${
              selectedId === p.id
                ? "border-brand bg-brand/10"
                : "border-border bg-white"
            }`}
          >
            {p.title} · {p.weeks}w
          </button>
        ))}
      </div>

      {selected ? (
        <div className="overflow-x-auto th-card">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-xl font-bold">
              {selected.weeks} week program · {selected.title}
            </h3>
          </div>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs tracking-wide th-muted uppercase">
                <th className="px-3 py-2">Week</th>
                {Array.from({ length: 7 }, (_, i) => (
                  <th key={i} className="px-3 py-2">
                    Day {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: selected.weeks }, (_, wi) => {
                const weekIndex = wi + 1;
                return (
                  <tr key={weekIndex} className="border-b border-border align-top">
                    <td className="px-3 py-3 font-semibold th-muted">
                      W{weekIndex}
                    </td>
                    {Array.from({ length: 7 }, (_, di) => {
                      const dayIndex = di + 1;
                      const cell = dayCell(weekIndex, dayIndex);
                      const workout = cell?.workoutId
                        ? workouts.find((w) => w.id === cell.workoutId)
                        : null;
                      return (
                        <td key={dayIndex} className="px-2 py-2">
                          <div className="min-h-20 border border-[var(--th-border)] bg-white p-2">
                            {workout ? (
                              <p className="text-xs font-semibold">
                                {workout.title}
                              </p>
                            ) : (
                              <p className="text-xs th-muted">Empty</p>
                            )}
                            <select
                              disabled={pending}
                              className="mt-2 w-full th-card px-1 py-1 text-xs"
                              value={cell?.workoutId ?? ""}
                              onChange={(e) =>
                                post({
                                  action: "setProgramDayWorkout",
                                  programId: selected.id,
                                  weekIndex,
                                  dayIndex,
                                  workoutId: e.target.value || null,
                                })
                              }
                            >
                              <option value="">Clear / empty</option>
                              {workouts.map((w) => (
                                <option key={w.id} value={w.id}>
                                  {w.title}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-[var(--th-blue)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
