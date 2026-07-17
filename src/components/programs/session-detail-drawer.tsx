"use client";

import { useEffect, useMemo, type ReactNode } from "react";

import type { Exercise, Workout, WorkoutBlock } from "@/features/programs/types";

type Props = {
  open: boolean;
  workout: Workout | null;
  blocks: WorkoutBlock[];
  exercises: Exercise[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function SessionDetailDrawer({
  open,
  workout,
  blocks,
  exercises,
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

  const ordered = useMemo(
    () => [...blocks].sort((a, b) => a.sortOrder - b.sortOrder),
    [blocks],
  );

  if (!open || !workout) return null;

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
        aria-labelledby="session-detail-title"
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
              id="session-detail-title"
              className="truncate text-base font-semibold text-[#111827]"
            >
              {workout.title}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <IconButton label="Edit session" onClick={onEdit}>
              <PencilIcon />
            </IconButton>
            <IconButton label="Delete session" onClick={onDelete} danger>
              <TrashIcon />
            </IconButton>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6">
          <div>
            <p className="text-[10px] font-bold tracking-wide text-[#6b7280] uppercase">
              Session instructions
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#111827]">
              {workout.coachInstructions.trim() || "—"}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold tracking-wide text-[#6b7280] uppercase">
              Blocks ({ordered.length})
            </p>
            {ordered.length === 0 ? (
              <p className="mt-2 text-sm text-[#6b7280]">No blocks yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {ordered.map((block) => {
                  const ex = exercises.find((e) => e.id === block.exerciseId);
                  return (
                    <li
                      key={block.id}
                      className="flex gap-3 border border-[#e5e7eb] bg-[#f9fafb] px-3 py-3"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-xs font-bold text-white">
                        {block.label}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#111827]">
                          {ex?.title ?? "Exercise"}
                        </p>
                        <p className="text-xs text-[#6b7280]">
                          {block.sectionTitle ?? "Strength/Power"}
                          {" · "}
                          {block.sets.length} set
                          {block.sets.length === 1 ? "" : "s"}
                        </p>
                        {block.sessionCues.trim() ? (
                          <p className="mt-1 text-xs text-[#374151]">
                            {block.sessionCues}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <p className="text-xs text-[#9ca3af]">
            Created {workout.createdAt.slice(0, 10)}
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
            Edit Session
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
