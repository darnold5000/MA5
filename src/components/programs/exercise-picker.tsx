"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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

type PanelPos = { top: number; left: number; width: number };

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
  const [pos, setPos] = useState<PanelPos | null>(null);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = value
    ? (exercises.find((e) => e.id === value) ?? null)
    : null;
  const counts = useMemo(() => categoryCounts(exercises), [exercises]);

  // When opening with a selected exercise, start filtered to its type
  useEffect(() => {
    if (!open) return;
    if (selected) {
      setCategory(selected.category);
    }
  }, [open, selected]);

  const filtered = useMemo(() => {
    if (!category) return [];
    const q = search.trim().toLowerCase();
    return exercises.filter((ex) => {
      if (ex.category !== category) return false;
      if (q && !ex.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [exercises, search, category]);

  useEffect(() => {
    setMounted(true);
  }, []);

  function updatePosition() {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 420), window.innerWidth - 24);
    let left = rect.left;
    if (left + width > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - width - 12);
    }
    const below = rect.bottom + 6;
    const maxPanel = Math.min(window.innerHeight * 0.7, 420);
    const top =
      below + maxPanel > window.innerHeight - 12
        ? Math.max(12, rect.top - maxPanel - 6)
        : below;
    setPos({ top, left, width });
  }

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    queueMicrotask(() => searchRef.current?.focus());
    const onScroll = () => updatePosition();
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const panel =
    open && mounted && pos
      ? createPortal(
          <div
            ref={panelRef}
            className="programs-th border border-[var(--th-border)] bg-white text-[var(--th-text)] shadow-xl"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              zIndex: 80,
              ["--th-bg" as string]: "#f3f4f6",
              ["--th-surface" as string]: "#ffffff",
              ["--th-surface-muted" as string]: "#f3f4f6",
              ["--th-text" as string]: "#111827",
              ["--th-muted" as string]: "#6b7280",
              ["--th-border" as string]: "#e5e7eb",
              ["--th-border-strong" as string]: "#d1d5db",
              ["--th-blue" as string]: "#2563eb",
              ["--th-yellow" as string]: "#eab308",
              color: "#111827",
              background: "#ffffff",
            }}
          >
            <div className="flex max-h-[min(70vh,420px)] flex-col">
              <div className="space-y-2 border-b border-[var(--th-border)] px-3 py-3">
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold tracking-wide text-[#6b7280] uppercase">
                    Type
                  </span>
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value as ExerciseCategory | "");
                      setSearch("");
                    }}
                    className="h-9 w-full border border-[#d1d5db] bg-white px-2 text-sm text-[#111827] outline-none focus:border-[#2563eb]"
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
                    className="h-9 w-full border border-[#d1d5db] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#2563eb] disabled:bg-[#f9fafb] disabled:text-[#9ca3af]"
                  />
                </label>
                <p className="text-[10px] font-bold tracking-wide text-[#6b7280] uppercase">
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
                  <li className="px-3 py-10 text-center text-sm text-[#6b7280]">
                    Select a type above to see exercises.
                  </li>
                ) : filtered.length === 0 ? (
                  <li className="px-3 py-8 text-center text-sm text-[#6b7280]">
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
                            "flex w-full items-center gap-2 border-b border-[#e5e7eb] px-3 py-2.5 text-left text-sm text-[#111827] hover:bg-[#f3f4f6]",
                            active && "bg-[#f3f4f6]",
                          )}
                          onClick={() => {
                            onChange(ex.id);
                            setOpen(false);
                            setSearch("");
                          }}
                        >
                          <span
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-xs font-bold text-white"
                            style={{ background: "#eab308" }}
                            aria-hidden
                          >
                            #
                          </span>
                          <span className="min-w-0 flex-1 font-semibold text-[#111827]">
                            {ex.title}
                          </span>
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
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
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
        <ChevronIcon open={open} />
      </button>
      {panel}
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      className={cn(
        "shrink-0 text-[var(--th-muted)] transition",
        open && "rotate-180",
      )}
      aria-hidden
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
