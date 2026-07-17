"use client";

import { useEffect, useMemo, type ReactNode } from "react";

import type { Program, ProgramDay, Workout } from "@/features/programs/types";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Props = {
  open: boolean;
  program: Program | null;
  programDays: ProgramDay[];
  workouts: Workout[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function ProgramDetailDrawer({
  open,
  program,
  programDays,
  workouts,
  onClose,
  onEdit,
  onDelete,
}: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const days = useMemo(() => {
    if (!program) return [];
    return programDays
      .filter((d) => d.programId === program.id)
      .sort(
        (a, b) =>
          a.weekIndex - b.weekIndex || a.dayIndex - b.dayIndex,
      );
  }, [program, programDays]);

  const scheduled = days.filter((d) => d.workoutId);
  const workoutsById = useMemo(
    () => new Map(workouts.map((w) => [w.id, w])),
    [workouts],
  );

  if (!open || !program) return null;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="program-detail-title"
        className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#e5e7eb] px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 text-[#6b7280] hover:text-[#111827]"
              aria-label="Close"
            >
              <CloseIcon />
            </button>
            <h2
              id="program-detail-title"
              className="truncate text-base font-semibold text-[#111827]"
            >
              {program.title}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <IconButton label="Edit program" onClick={onEdit}>
              <PencilIcon />
            </IconButton>
            <IconButton label="Delete program" onClick={onDelete} danger>
              <TrashIcon />
            </IconButton>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2">
              <p className="text-[10px] font-semibold tracking-wide text-[#6b7280] uppercase">
                Length
              </p>
              <p className="mt-0.5 text-sm font-semibold text-[#111827]">
                {program.weeks} week{program.weeks === 1 ? "" : "s"}
              </p>
            </div>
            <div className="border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2">
              <p className="text-[10px] font-semibold tracking-wide text-[#6b7280] uppercase">
                Sessions placed
              </p>
              <p className="mt-0.5 text-sm font-semibold text-[#111827]">
                {scheduled.length}
              </p>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold tracking-wide text-[#6b7280] uppercase">
              Schedule preview
            </p>
            {scheduled.length === 0 ? (
              <p className="mt-2 text-sm text-[#6b7280]">
                No sessions on the grid yet. Open Edit to add them.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {scheduled.map((day) => {
                  const w = day.workoutId
                    ? workoutsById.get(day.workoutId)
                    : null;
                  return (
                    <li
                      key={day.id}
                      className="flex items-start justify-between gap-3 border border-[#e5e7eb] px-3 py-2.5"
                    >
                      <div>
                        <p className="text-xs font-bold tracking-wide text-[#6b7280] uppercase">
                          Week {day.weekIndex} ·{" "}
                          {DAY_NAMES[day.dayIndex - 1] ?? `Day ${day.dayIndex}`}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-[#111827]">
                          {w?.title ?? "Session"}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <p className="text-xs text-[#9ca3af]">
            Created {program.createdAt.slice(0, 10)}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#e5e7eb] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-[#2563eb] hover:underline"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-sm bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Open Program
          </button>
        </div>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={
        danger
          ? "inline-flex h-9 w-9 items-center justify-center text-[#9ca3af] hover:text-[#dc2626]"
          : "inline-flex h-9 w-9 items-center justify-center text-[#6b7280] hover:text-[#111827]"
      }
    >
      {children}
    </button>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 7h14M10 11v6M14 11v6M8 7V5h8v2M7 7l1 12h8l1-12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
