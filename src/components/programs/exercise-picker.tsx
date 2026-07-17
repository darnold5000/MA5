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
};

type PanelPos = { top: number; left: number; width: number };

export function ExercisePicker({
  exercises,
  value,
  disabled,
  onChange,
  className,
}: ExercisePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<
    ExerciseCategory[]
  >([]);
  const [pos, setPos] = useState<PanelPos | null>(null);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = exercises.find((e) => e.id === value) ?? null;
  const counts = useMemo(() => categoryCounts(exercises), [exercises]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exercises.filter((ex) => {
      if (
        selectedCategories.length > 0 &&
        !selectedCategories.includes(ex.category)
      ) {
        return false;
      }
      if (q && !ex.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [exercises, search, selectedCategories]);

  useEffect(() => {
    setMounted(true);
  }, []);

  function updatePosition() {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 480), window.innerWidth - 24);
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

  function toggleCategory(cat: ExerciseCategory) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }

  const panel =
    open && mounted && pos
      ? createPortal(
          <div
            ref={panelRef}
            className="border border-[var(--th-border)] bg-white shadow-xl"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              zIndex: 80,
            }}
          >
            <div className="grid max-h-[min(70vh,420px)] grid-cols-1 sm:grid-cols-[1fr_180px]">
              <div className="flex min-h-0 flex-col border-b border-[var(--th-border)] sm:border-r sm:border-b-0">
                <div className="border-b border-[var(--th-border)] px-3 py-2">
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search exercises"
                    className="th-input h-9"
                  />
                  <p className="mt-1.5 text-[10px] font-bold tracking-wide uppercase th-muted">
                    {filtered.length} exercises shown
                  </p>
                </div>
                <ul
                  className="min-h-0 flex-1 overflow-y-auto"
                  role="listbox"
                  aria-label="Exercises"
                >
                  {filtered.length === 0 ? (
                    <li className="px-3 py-8 text-center text-sm th-muted">
                      No exercises match these filters.
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
                              "flex w-full items-center gap-2 border-b border-[var(--th-border)] px-3 py-2.5 text-left text-sm hover:bg-[var(--th-surface-muted)]",
                              active && "bg-[var(--th-surface-muted)]",
                            )}
                            onClick={() => {
                              onChange(ex.id);
                              setOpen(false);
                              setSearch("");
                            }}
                          >
                            <span
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-xs font-bold text-white"
                              style={{ background: "var(--th-yellow)" }}
                              aria-hidden
                            >
                              #
                            </span>
                            <span className="min-w-0 flex-1 font-semibold text-[var(--th-text)]">
                              {ex.title}
                            </span>
                            <span className="shrink-0 text-[10px] font-semibold tracking-wide uppercase th-muted">
                              {ex.category}
                            </span>
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>

              <div className="flex min-h-0 flex-col bg-[var(--th-surface-muted)]/40">
                <p className="border-b border-[var(--th-border)] px-3 py-2 text-[10px] font-bold tracking-wide uppercase th-muted">
                  Filters
                </p>
                <ul className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
                  {EXERCISE_CATEGORIES.map((cat) => {
                    const checked = selectedCategories.includes(cat);
                    return (
                      <li key={cat}>
                        <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1.5 text-sm hover:bg-white/80">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCategory(cat)}
                            className="accent-[var(--th-blue)]"
                          />
                          <span className="min-w-0 flex-1 text-[var(--th-text)]">
                            {cat}
                          </span>
                          <span className="text-xs th-muted">{counts[cat]}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  className="border-t border-[var(--th-border)] px-3 py-2.5 text-left text-xs font-bold tracking-wide text-[var(--th-blue)] uppercase hover:bg-white"
                  onClick={() => setSelectedCategories([])}
                >
                  Clear Filters
                </button>
              </div>
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
          {selected?.title ?? "Select exercise"}
        </span>
        {selected ? (
          <span className="hidden shrink-0 text-[10px] font-semibold tracking-wide uppercase th-muted sm:inline">
            {selected.category}
          </span>
        ) : null}
        <FilterBadge count={selectedCategories.length} />
        <ChevronIcon open={open} />
      </button>
      {panel}
    </div>
  );
}

function FilterBadge({ count }: { count: number }) {
  if (count === 0) {
    return (
      <span className="inline-flex h-8 w-8 items-center justify-center rounded border border-[var(--th-border)] text-[var(--th-muted)]">
        <FilterIcon />
      </span>
    );
  }
  return (
    <span className="relative inline-flex h-8 w-8 items-center justify-center rounded border border-[var(--th-blue)] text-[var(--th-blue)]">
      <FilterIcon />
      <span
        className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
        style={{ background: "var(--th-blue)" }}
      >
        {count}
      </span>
    </span>
  );
}

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16M7 12h10M10 18h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn("shrink-0 th-muted transition", open && "rotate-180")}
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
