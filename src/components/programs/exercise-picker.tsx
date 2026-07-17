"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  categoryCounts,
  EXERCISE_CATEGORIES,
  type ExerciseCategory,
} from "@/features/programs/exercise-library";
import type { Exercise } from "@/features/programs/types";
import { cn } from "@/lib/utils";

type ExercisePickerProps = {
  exercises: Exercise[];
  value: string;
  disabled?: boolean;
  onChange: (exerciseId: string) => void;
  className?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
};

export function ExercisePicker({
  exercises,
  value,
  disabled,
  onChange,
  className,
  allowEmpty = false,
  emptyLabel = "Select an exercise",
}: ExercisePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ExerciseCategory | "">("");
  const [mounted, setMounted] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  const selected = value
    ? (exercises.find((e) => e.id === value) ?? null)
    : null;
  const counts = useMemo(() => categoryCounts(exercises), [exercises]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (selected) setCategory(selected.category);
    const t = window.setTimeout(() => searchRef.current?.focus(), 50);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = "";
    };
  }, [open, selected]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const filtered = useMemo(() => {
    if (!category) return [];
    const q = search.trim().toLowerCase();
    return exercises.filter((ex) => {
      if (ex.category !== category) return false;
      if (q && !ex.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [exercises, search, category]);

  function pick(exerciseId: string) {
    onChange(exerciseId);
    setOpen(false);
    setSearch("");
  }

  const drawer =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[80] flex justify-end">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close exercise picker"
              onClick={() => setOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="programs-th relative flex h-full w-full max-w-md flex-col bg-white text-[var(--th-text)] shadow-2xl"
            >
              <div className="flex items-center gap-3 border-b border-[var(--th-border)] px-5 py-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-[var(--th-muted)] hover:text-[var(--th-text)]"
                  aria-label="Close"
                >
                  <CloseIcon />
                </button>
                <div className="min-w-0">
                  <h2
                    id={titleId}
                    className="text-base font-semibold text-[var(--th-text)]"
                  >
                    Choose exercise
                  </h2>
                  <p className="text-xs th-muted">
                    Pick a type, then select from the list
                  </p>
                </div>
              </div>

              <div className="space-y-3 border-b border-[var(--th-border)] px-5 py-4">
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold tracking-wide uppercase th-muted">
                    Type
                  </span>
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value as ExerciseCategory | "");
                      setSearch("");
                    }}
                    className="th-input h-10"
                  >
                    <option value="">Select type…</option>
                    {EXERCISE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat} ({counts[cat]})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="sr-only">Search</span>
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    disabled={!category}
                    placeholder={
                      category
                        ? `Search ${category.toLowerCase()}…`
                        : "Select a type first"
                    }
                    className="th-input h-10 disabled:bg-[var(--th-surface-muted)] disabled:text-[var(--th-muted)]"
                  />
                </label>
                <p className="text-[10px] font-bold tracking-wide uppercase th-muted">
                  {category
                    ? `${filtered.length} exercises`
                    : "Choose a type to browse"}
                </p>
              </div>

              <ul
                className="min-h-0 flex-1 overflow-y-auto"
                role="listbox"
                aria-label="Exercises"
              >
                {!category ? (
                  <li className="px-5 py-12 text-center text-sm th-muted">
                    Select a type above to see exercises.
                  </li>
                ) : filtered.length === 0 ? (
                  <li className="px-5 py-12 text-center text-sm th-muted">
                    No exercises match this type / search.
                  </li>
                ) : (
                  filtered.map((ex) => {
                    const active = ex.id === value;
                    return (
                      <li key={ex.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          className={cn(
                            "flex w-full items-center gap-3 border-b border-[var(--th-border)] px-5 py-3 text-left text-sm hover:bg-[var(--th-surface-muted)]",
                            active && "bg-[var(--th-surface-muted)]",
                          )}
                          onClick={() => pick(ex.id)}
                        >
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-xs font-bold text-white"
                            style={{ background: "var(--th-yellow)" }}
                            aria-hidden
                          >
                            #
                          </span>
                          <span className="min-w-0 flex-1 font-semibold text-[var(--th-text)]">
                            {ex.title}
                          </span>
                          {active ? (
                            <span className="text-[10px] font-bold tracking-wide text-[var(--th-blue)] uppercase">
                              Selected
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="th-bar flex w-full min-h-10 items-center gap-2 px-2 py-1.5 text-left disabled:opacity-50"
      >
        <span className="min-w-0 flex-1 truncate text-base font-semibold text-[var(--th-text)]">
          {selected?.title ?? (allowEmpty ? emptyLabel : "Select exercise")}
        </span>
        {selected ? (
          <span className="hidden shrink-0 text-[10px] font-semibold tracking-wide uppercase th-muted sm:inline">
            {selected.category}
          </span>
        ) : null}
        <ChevronIcon />
      </button>
      {drawer}
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0 text-[var(--th-muted)]"
      aria-hidden
    >
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
