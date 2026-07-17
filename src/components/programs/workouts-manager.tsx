"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ExerciseBlockCard } from "@/components/programs/exercise-block-card";
import type {
  Exercise,
  Workout,
  WorkoutBlock,
  WorkoutBlockSet,
} from "@/features/programs/types";
import { cn } from "@/lib/utils";

type Props = {
  workouts: Workout[];
  blocks: WorkoutBlock[];
  exercises: Exercise[];
  /** Prefer this workout when opening (e.g. from program day or library edit). */
  focusWorkoutId?: string | null;
  /** Hide library chrome — day editor inside a program. */
  embedded?: boolean;
  /** Start a brand-new session template (Library → Create Session). */
  startFresh?: boolean;
  onBack?: () => void;
  onSaved?: (workoutId: string) => void;
};

type DraftBlock = {
  /** Server id when persisted; temp id while drafting */
  id: string;
  clientKey: string;
  label: string;
  sectionTitle: string;
  exerciseId: string | null;
  sessionCues: string;
  sets: WorkoutBlockSet[];
  persisted: boolean;
};

function labelForIndex(index: number) {
  return String.fromCharCode(65 + Math.min(index, 25));
}

function toDraft(block: WorkoutBlock): DraftBlock {
  return {
    id: block.id,
    clientKey: block.id,
    label: block.label,
    sectionTitle: block.sectionTitle ?? "Strength/Power",
    exerciseId: block.exerciseId,
    sessionCues: block.sessionCues,
    sets: block.sets.length
      ? block.sets
      : [{ setNumber: 1, reps: 8, weightLb: null }],
    persisted: true,
  };
}

export function WorkoutsManager({
  workouts,
  blocks,
  exercises,
  focusWorkoutId = null,
  embedded = false,
  startFresh = false,
  onBack,
  onSaved,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [workoutId, setWorkoutId] = useState<string | null>(
    startFresh ? null : (focusWorkoutId ?? null),
  );
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [draftBlocks, setDraftBlocks] = useState<DraftBlock[]>([]);
  const hydratedKeyRef = useRef<string | null>(null);

  const existing = workouts.find((w) => w.id === workoutId) ?? null;

  // Boot / switch template when Library asks for a different session
  useEffect(() => {
    const nextKey = startFresh ? "new" : (focusWorkoutId ?? "none");
    // Same session after router.refresh — keep local draft
    if (hydratedKeyRef.current === nextKey) return;
    hydratedKeyRef.current = nextKey;

    if (startFresh || !focusWorkoutId) {
      setWorkoutId(null);
      setTitle("");
      setInstructions("");
      setDraftBlocks([]);
      setDirty(false);
      setError(null);
      return;
    }

    const w = workouts.find((x) => x.id === focusWorkoutId);
    if (!w) {
      // Workout not in props yet (e.g. just created) — allow retry
      hydratedKeyRef.current = null;
      return;
    }
    setWorkoutId(w.id);
    setTitle(w.title);
    setInstructions(w.coachInstructions);
    setDraftBlocks(
      blocks
        .filter((b) => b.workoutId === w.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(toDraft),
    );
    setDirty(false);
    setError(null);
  }, [startFresh, focusWorkoutId, workouts, blocks]);

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

  function markDirty() {
    setDirty(true);
  }

  function addBlock() {
    setDraftBlocks((prev) => [
      ...prev,
      {
        id: `temp_${Date.now()}`,
        clientKey: `temp_${Date.now()}`,
        label: labelForIndex(prev.length),
        sectionTitle: "Strength/Power",
        exerciseId: null,
        sessionCues: "",
        sets: [
          { setNumber: 1, reps: 8, weightLb: null },
          { setNumber: 2, reps: 8, weightLb: null },
          { setNumber: 3, reps: 8, weightLb: null },
        ],
        persisted: false,
      },
    ]);
    markDirty();
  }

  function patchDraft(clientKey: string, patch: Partial<DraftBlock>) {
    setDraftBlocks((prev) =>
      prev.map((b) => (b.clientKey === clientKey ? { ...b, ...patch } : b)),
    );
    markDirty();
  }

  function removeDraft(clientKey: string) {
    setDraftBlocks((prev) => {
      const next = prev.filter((b) => b.clientKey !== clientKey);
      return next.map((b, i) => ({ ...b, label: labelForIndex(i) }));
    });
    markDirty();
  }

  async function saveTemplate() {
    if (!title.trim()) {
      setError("Session title is required.");
      return;
    }
    const missingExercise = draftBlocks.some((b) => !b.exerciseId);
    if (missingExercise) {
      setError("Choose an exercise for every block before saving.");
      return;
    }

    let id = workoutId;
    if (!id) {
      const created = await post({
        action: "createWorkout",
        title: title.trim(),
        coachInstructions: instructions,
      });
      if (!created?.workout) return;
      id = created.workout.id as string;
      setWorkoutId(id);
    } else {
      const updated = await post({
        action: "updateWorkout",
        id,
        title: title.trim(),
        coachInstructions: instructions,
      });
      if (!updated) return;
    }

    // Remove persisted blocks that were deleted from the draft
    const keepIds = new Set(
      draftBlocks.filter((b) => b.persisted).map((b) => b.id),
    );
    const serverBlocks = blocks.filter((b) => b.workoutId === id);
    for (const sb of serverBlocks) {
      if (!keepIds.has(sb.id)) {
        await post({ action: "removeBlock", id: sb.id });
      }
    }

    const nextDrafts: DraftBlock[] = [];
    for (const draft of draftBlocks) {
      if (!draft.exerciseId || !id) continue;
      if (draft.persisted) {
        const ok = await post({
          action: "updateBlock",
          id: draft.id,
          exerciseId: draft.exerciseId,
          sessionCues: draft.sessionCues,
          sectionTitle: draft.sectionTitle,
          sets: draft.sets,
        });
        if (!ok) return;
        nextDrafts.push(draft);
      } else {
        const data = await post({
          action: "addBlock",
          workoutId: id,
          exerciseId: draft.exerciseId,
          label: draft.label,
          sectionTitle: draft.sectionTitle,
          sessionCues: draft.sessionCues,
          sets: draft.sets,
        });
        if (!data?.block) return;
        nextDrafts.push(toDraft(data.block as WorkoutBlock));
      }
    }

    setDraftBlocks(nextDrafts);
    setDirty(false);
    setError(null);
    onSaved?.(id);
  }

  function discardChanges() {
    if (onBack) {
      onBack();
      return;
    }
    if (existing) {
      setTitle(existing.title);
      setInstructions(existing.coachInstructions);
      setDraftBlocks(
        blocks
          .filter((b) => b.workoutId === existing.id)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(toDraft),
      );
      setDirty(false);
    } else {
      setTitle("");
      setInstructions("");
      setDraftBlocks([]);
      setDirty(false);
    }
  }

  const previewItems = useMemo(() => {
    return draftBlocks.map((b) => {
      const ex = b.exerciseId
        ? exercises.find((e) => e.id === b.exerciseId)
        : null;
      const setCount = b.sets.length;
      return {
        key: b.clientKey,
        label: b.label,
        title: ex?.title ?? b.sectionTitle,
        subtitle: ex
          ? `${setCount} Set${setCount === 1 ? "" : "s"} (Reps, Weight (lb))`
          : "Select an exercise",
        hasExercise: Boolean(ex),
      };
    });
  }, [draftBlocks, exercises]);

  // Placeholder block cards need a WorkoutBlock-shaped object for ExerciseBlockCard
  function asBlock(draft: DraftBlock): WorkoutBlock {
    return {
      id: draft.id,
      workoutId: workoutId ?? "draft",
      sortOrder: 0,
      label: draft.label,
      sectionTitle: draft.sectionTitle,
      exerciseId: draft.exerciseId ?? "",
      sessionCues: draft.sessionCues,
      sets: draft.sets,
    };
  }

  return (
    <div className="space-y-4">
      {!embedded ? (
        <button type="button" onClick={onBack} className="th-link text-sm">
          ← Back To Library
        </button>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Session Preview */}
        <aside className="border border-[var(--th-border)] bg-white">
          <div className="border-b border-[var(--th-border)] px-3 py-3 text-[11px] font-bold tracking-wide text-[#111827] uppercase">
            Session Preview
          </div>
          <div className="p-3">
            {previewItems.length === 0 ? (
              <p className="text-sm text-[#6b7280]">
                No blocks have been added to this session…
              </p>
            ) : (
              <ul className="space-y-3">
                {previewItems.map((item) => (
                  <li key={item.key} className="flex gap-2">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: "#2563eb" }}
                    >
                      {item.label}
                    </span>
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          item.hasExercise ? "text-[#111827]" : "text-[#9ca3af]",
                        )}
                      >
                        {item.title}
                      </p>
                      <p className="text-xs text-[#6b7280]">{item.subtitle}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Session Template Form */}
        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold tracking-wide text-[#111827] uppercase">
              Session Template Form
            </h2>
            {dirty ? (
              <span className="rounded-full border border-amber-500 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-700 uppercase">
                Unsaved Changes
              </span>
            ) : workoutId ? (
              <span className="rounded-full border border-[#d1d5db] px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-[#6b7280] uppercase">
                Saved
              </span>
            ) : (
              <span className="rounded-full border border-[#f59e0b] px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-[#b45309] uppercase">
                New Template
              </span>
            )}
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-semibold tracking-wide text-[#2563eb] uppercase">
              Session Title
            </span>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                markDirty();
              }}
              className="w-full border-0 border-b border-[#d1d5db] bg-transparent px-0 py-2 text-lg font-semibold text-[#111827] outline-none focus:border-[#2563eb]"
              placeholder="Session title"
            />
            {!title.trim() ? (
              <span className="text-xs text-[#dc2626]">Required</span>
            ) : null}
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold tracking-wide text-[#6b7280] uppercase">
              Session Instructions
            </span>
            <textarea
              value={instructions}
              onChange={(e) => {
                setInstructions(e.target.value);
                markDirty();
              }}
              rows={3}
              maxLength={10000}
              className="w-full resize-y border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#2563eb]"
              placeholder="Instructions help the athlete understand the goals of this session."
            />
            <span className="block text-right text-xs text-[#6b7280]">
              {instructions.length}/10000
            </span>
          </label>

          <div className="space-y-4">
            {draftBlocks.map((draft) => (
              <div key={draft.clientKey}>
                <ExerciseBlockCard
                  block={asBlock(draft)}
                  exercises={exercises}
                  pending={pending}
                  allowEmptyExercise
                  onChangeExercise={(id) =>
                    patchDraft(draft.clientKey, { exerciseId: id })
                  }
                  onChangeCues={(cues) =>
                    patchDraft(draft.clientKey, { sessionCues: cues })
                  }
                  onChangeSets={(sets) =>
                    patchDraft(draft.clientKey, { sets })
                  }
                  onSaveSets={(sets) =>
                    patchDraft(draft.clientKey, { sets })
                  }
                  onRemove={() => removeDraft(draft.clientKey)}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pending || exercises.length === 0}
              onClick={addBlock}
              className="th-btn-primary"
            >
              Add Block
            </button>
            <span className="text-xs text-[#6b7280]">
              Pick an exercise for each block — they appear in Session Preview.
            </span>
          </div>

          {error ? (
            <p className="text-sm text-[#dc2626]" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-4 border-t border-[var(--th-border)] pt-4">
            {dirty ? (
              <p className="mr-auto rounded-sm bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                You have unsaved changes
              </p>
            ) : null}
            <button
              type="button"
              className="text-sm font-semibold text-[#2563eb] hover:underline"
              onClick={discardChanges}
              disabled={pending}
            >
              {onBack && !workoutId ? "Cancel" : "Discard Changes"}
            </button>
            <button
              type="button"
              disabled={pending || !title.trim()}
              onClick={() => void saveTemplate()}
              className="th-btn-primary disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save Template"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
