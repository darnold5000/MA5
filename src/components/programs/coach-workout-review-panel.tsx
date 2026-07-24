"use client";

import { useEffect, useState } from "react";

import { getSetLogForBlock } from "@/features/programs/set-logs";
import type {
  CoachTeamWorkoutReview,
  CoachWorkoutReview,
  WorkoutDetail,
  WorkoutSetLog,
} from "@/features/programs/types";
import { cn } from "@/lib/utils";

type ClientProps = {
  mode: "client";
  clientUserId: string;
  clientName: string;
  calendarEntryId: string;
  onClose: () => void;
};

type TeamProps = {
  mode: "team";
  teamId: string;
  calendarEntryId: string;
  onClose: () => void;
};

type Props = ClientProps | TeamProps;

function formatWeight(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value} lb`;
}

function weightDelta(
  prescribed: number | null,
  actual: number | null,
): number | null {
  if (prescribed == null || actual == null) return null;
  return actual - prescribed;
}

function WorkoutBlocksReview({
  workout,
  setLogs,
}: {
  workout: WorkoutDetail;
  setLogs: WorkoutSetLog[];
}) {
  return (
    <div className="space-y-4">
      {workout.blocks.map((block) => (
        <article
          key={block.id}
          className="border border-[var(--th-border)] bg-[var(--th-surface)] p-4"
        >
          <p className="text-xs font-semibold tracking-wide uppercase text-[var(--th-blue)]">
            {block.label}
            {block.sectionTitle ? ` · ${block.sectionTitle}` : ""}
          </p>
          <h3 className="mt-1 font-bold">
            {block.exercise?.title ?? "Exercise"}
          </h3>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-[var(--th-border)] text-left text-xs tracking-wide th-muted uppercase">
                  <th className="py-2 pr-3 font-semibold">Set</th>
                  <th className="py-2 pr-3 font-semibold">Reps</th>
                  <th className="py-2 pr-3 font-semibold">Prescribed</th>
                  <th className="py-2 pr-3 font-semibold">Athlete</th>
                  <th className="py-2 font-semibold">Δ</th>
                </tr>
              </thead>
              <tbody>
                {block.sets.map((set) => {
                  const log = getSetLogForBlock(
                    setLogs,
                    block.id,
                    set.setNumber,
                  );
                  const athleteWeight = log?.weightLb ?? null;
                  const delta = weightDelta(set.weightLb, athleteWeight);
                  return (
                    <tr
                      key={set.setNumber}
                      className="border-b border-[var(--th-border)]/60"
                    >
                      <td className="py-2 pr-3 font-medium">{set.setNumber}</td>
                      <td className="py-2 pr-3">{set.reps ?? "—"}</td>
                      <td className="py-2 pr-3 text-muted">
                        {formatWeight(set.weightLb)}
                      </td>
                      <td
                        className={cn(
                          "py-2 pr-3 font-medium",
                          athleteWeight != null
                            ? "text-[var(--th-text)]"
                            : "text-muted",
                        )}
                      >
                        {formatWeight(athleteWeight)}
                      </td>
                      <td className="py-2">
                        {delta == null ? (
                          <span className="text-muted">—</span>
                        ) : delta === 0 ? (
                          <span className="text-muted">0</span>
                        ) : (
                          <span
                            className={cn(
                              "font-medium",
                              delta > 0 ? "text-emerald-600" : "text-amber-700",
                            )}
                          >
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {block.sessionCues ? (
            <p className="mt-3 text-sm th-muted">{block.sessionCues}</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export function CoachWorkoutReviewPanel(props: Props) {
  const { calendarEntryId, onClose } = props;
  const [clientReview, setClientReview] = useState<CoachWorkoutReview | null>(
    null,
  );
  const [teamReview, setTeamReview] = useState<CoachTeamWorkoutReview | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ calendarEntryId });
      if (props.mode === "team") {
        params.set("teamId", props.teamId);
      } else {
        params.set("clientUserId", props.clientUserId);
        params.set("clientName", props.clientName);
      }

      const res = await fetch(
        `/api/admin/programs/workout-review?${params.toString()}`,
      );
      const data = await res.json();
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setError(data.error ?? "Could not load workout");
        return;
      }
      if (data.mode === "team") {
        setTeamReview(data.review as CoachTeamWorkoutReview);
        setClientReview(null);
      } else {
        setClientReview(data.review as CoachWorkoutReview);
        setTeamReview(null);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [calendarEntryId, props]);

  const title =
    clientReview?.entry.title ?? teamReview?.entry.title ?? "Loading…";
  const entryDate = clientReview?.entry.entryDate ?? teamReview?.entry.entryDate;
  const subtitle =
    props.mode === "team"
      ? teamReview
        ? `${teamReview.team.name} · ${teamReview.members.length} athletes`
        : "Small group"
      : props.clientName;

  const loggedSetCount =
    clientReview?.setLogs.filter((log) => log.weightLb != null).length ??
    teamReview?.members.reduce(
      (sum, member) =>
        sum + member.setLogs.filter((log) => log.weightLb != null).length,
      0,
    ) ??
    0;

  const workout = clientReview?.workout ?? teamReview?.workout ?? null;

  return (
    <section className="th-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide uppercase th-muted">
            Workout review
          </p>
          <h2 className="mt-1 text-lg font-bold">{title}</h2>
          <p className="mt-1 text-sm th-muted">
            {subtitle}
            {entryDate ? ` · ${entryDate}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold tracking-wide uppercase th-muted hover:text-[var(--th-text)]"
        >
          Close
        </button>
      </div>

      {loading ? (
        <p className="mt-6 text-sm th-muted">Loading performance…</p>
      ) : null}

      {error ? (
        <p className="mt-6 text-sm text-[var(--th-blue)]" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && (clientReview || teamReview) ? (
        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap gap-4 text-sm">
            {props.mode === "client" && clientReview ? (
              <div>
                <p className="text-xs font-semibold tracking-wide uppercase th-muted">
                  Status
                </p>
                <p className="mt-1 font-medium">
                  {clientReview.completion ? "Completed" : "Not completed"}
                </p>
              </div>
            ) : null}
            <div>
              <p className="text-xs font-semibold tracking-wide uppercase th-muted">
                Sets logged
              </p>
              <p className="mt-1 font-medium">{loggedSetCount}</p>
            </div>
            {props.mode === "team" && teamReview ? (
              <div>
                <p className="text-xs font-semibold tracking-wide uppercase th-muted">
                  Completed
                </p>
                <p className="mt-1 font-medium">
                  {
                    teamReview.members.filter((member) => member.completion)
                      .length
                  }{" "}
                  / {teamReview.members.length}
                </p>
              </div>
            ) : null}
          </div>

          {clientReview?.completion?.clientNote ? (
            <div className="border border-[var(--th-border)] bg-[var(--th-surface)] px-4 py-3 text-sm">
              <p className="text-xs font-semibold tracking-wide uppercase th-muted">
                Athlete note
              </p>
              <p className="mt-2 whitespace-pre-wrap">
                {clientReview.completion.clientNote}
              </p>
            </div>
          ) : null}

          {workout?.coachInstructions ? (
            <div className="border border-[var(--th-border)] bg-[var(--th-surface)] px-4 py-3 text-sm">
              <p className="text-xs font-semibold tracking-wide uppercase th-muted">
                Coach instructions
              </p>
              <p className="mt-2">{workout.coachInstructions}</p>
            </div>
          ) : null}

          {props.mode === "client" && clientReview && workout ? (
            <WorkoutBlocksReview workout={workout} setLogs={clientReview.setLogs} />
          ) : null}

          {props.mode === "team" && teamReview && workout ? (
            <div className="space-y-4">
              <p className="text-xs font-semibold tracking-wide uppercase th-muted">
                Athlete performance
              </p>
              {teamReview.members.map((member) => {
                const memberLogged = member.setLogs.filter(
                  (log) => log.weightLb != null,
                ).length;
                return (
                  <details
                    key={member.clientUserId}
                    className="border border-[var(--th-border)] bg-[var(--th-surface)]"
                    open={memberLogged > 0}
                  >
                    <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
                      {member.clientName}
                      <span className="ml-2 text-xs font-normal th-muted">
                        {member.completion ? "Completed" : "In progress"} ·{" "}
                        {memberLogged} sets logged
                      </span>
                    </summary>
                    <div className="border-t border-[var(--th-border)] p-4">
                      {member.completion?.clientNote ? (
                        <p className="mb-4 text-sm th-muted">
                          Note: {member.completion.clientNote}
                        </p>
                      ) : null}
                      <WorkoutBlocksReview
                        workout={workout}
                        setLogs={member.setLogs}
                      />
                    </div>
                  </details>
                );
              })}
            </div>
          ) : null}

          {!workout ? (
            <p className="text-sm th-muted">
              No workout content is attached to this calendar entry.
            </p>
          ) : null}

          {loggedSetCount === 0 ? (
            <p className="text-sm th-muted">
              No weights logged yet. Athletes record sets in their workout
              player during class.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
