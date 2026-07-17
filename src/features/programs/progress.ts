import { TEST_CLIENT_EMAIL } from "@/content/demo-persona";
import type { ProgramsState } from "@/features/programs/demo-store";
import type {
  ClientProgramDay,
  ClientTrainingProgress,
  CoachAttentionAlert,
  CoachClientProgressRow,
  TrainingEngagementStatus,
} from "@/features/programs/types";

/** Demo cookie IDs that alias the real test client email. */
export function resolveProgramsClientIds(
  userId: string,
  email?: string | null,
): string[] {
  const ids = new Set<string>([userId]);
  if (email?.trim().toLowerCase() === TEST_CLIENT_EMAIL.toLowerCase()) {
    ids.add("client-alex");
  }
  if (userId === "client-alex") {
    ids.add("client-alex");
  }
  return [...ids];
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function formatRelativeWorkoutDay(isoDate: string): string {
  const today = new Date().toISOString().slice(0, 10);
  if (isoDate === today) return "Today";

  const yesterday = daysAgoIso(1);
  if (isoDate === yesterday) return "Yesterday";

  const target = new Date(`${isoDate}T12:00:00`);
  const now = new Date();
  const diffDays = Math.round(
    (now.getTime() - target.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays > 1 && diffDays < 14) {
    return `${diffDays} days ago`;
  }
  if (diffDays >= 14 && diffDays < 30) {
    const weeks = Math.round(diffDays / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(target);
}

function weekdayLabel(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
  }).format(new Date(`${isoDate}T12:00:00`));
}

function engagementStatus(daysSinceLast: number | null): {
  status: TrainingEngagementStatus;
  statusLabel: string;
} {
  if (daysSinceLast == null) {
    return { status: "stale", statusLabel: "No workouts yet" };
  }
  if (daysSinceLast <= 3) {
    return { status: "active", statusLabel: "Active" };
  }
  if (daysSinceLast <= 7) {
    return { status: "watch", statusLabel: "Needs check-in" };
  }
  return { status: "stale", statusLabel: "At risk" };
}

function daysSince(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const target = new Date(`${isoDate}T12:00:00`);
  const now = new Date();
  return Math.max(
    0,
    Math.round((now.getTime() - target.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

function computeStreak(days: ClientProgramDay[]): number {
  const completedDates = new Set(
    days.filter((d) => d.completed).map((d) => d.entry.entryDate),
  );
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const key = daysAgoIso(i);
    if (completedDates.has(key)) {
      streak += 1;
      continue;
    }
    if (i === 0) continue;
    break;
  }
  return streak;
}

function findActiveAssignment(state: ProgramsState, clientIds: string[]) {
  return (
    state.assignments.find(
      (a) =>
        a.status === "active" &&
        a.clientUserId != null &&
        clientIds.includes(a.clientUserId),
    ) ??
    state.assignments.find(
      (a) =>
        a.status === "active" &&
        a.teamId != null &&
        state.teamMembers.some(
          (m) => m.teamId === a.teamId && clientIds.includes(m.userId),
        ),
    ) ??
    state.assignments.find(
      (a) =>
        a.status === "completed" &&
        a.clientUserId != null &&
        clientIds.includes(a.clientUserId),
    ) ??
    null
  );
}

function programEndDate(startDate: string, weeks: number): string {
  const d = new Date(`${startDate}T12:00:00`);
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

export function buildClientTrainingProgress(
  days: ClientProgramDay[],
  state: ProgramsState,
  clientIds: string[],
): ClientTrainingProgress {
  const today = new Date().toISOString().slice(0, 10);
  const published = days.filter((d) => d.entry.publishStatus === "published");
  const completedCount = published.filter((d) => d.completed).length;
  const totalCount = Math.max(published.length, 1);
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const assignment = findActiveAssignment(state, clientIds);

  const program = assignment?.programId
    ? state.programs.find((p) => p.id === assignment.programId) ?? null
    : state.programs[0] ?? null;

  let weekLabel: string | null = null;
  if (program && assignment && assignment.status === "active") {
    const start = new Date(`${assignment.startDate}T12:00:00`);
    const now = new Date();
    const weekNum = Math.min(
      program.weeks,
      Math.max(
        1,
        Math.floor(
          (now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000),
        ) + 1,
      ),
    );
    weekLabel = `Week ${weekNum} of ${program.weeks}`;
  }

  const todayDay =
    published.find((d) => d.entry.entryDate === today) ??
    published.find((d) => d.entry.entryDate >= today) ??
    null;

  const pastCompleted = published
    .filter((d) => d.completed && d.entry.entryDate <= today)
    .sort((a, b) => b.entry.entryDate.localeCompare(a.entry.entryDate));

  const last = pastCompleted[0] ?? null;

  const history = published
    .filter((d) => d.completed || d.entry.entryDate < today)
    .sort((a, b) => b.entry.entryDate.localeCompare(a.entry.entryDate))
    .slice(0, 12)
    .map((d) => ({
      entryId: d.entry.id,
      title: d.entry.title,
      dateLabel: formatRelativeWorkoutDay(d.entry.entryDate),
      completed: d.completed,
    }));

  return {
    programId: program?.id ?? null,
    programTitle: program?.title ?? null,
    programWeeks: program?.weeks ?? null,
    weekLabel,
    completedCount,
    totalCount: published.length,
    progressPercent: published.length === 0 ? 0 : progressPercent,
    todayWorkout: todayDay
      ? {
          entryId: todayDay.entry.id,
          title: todayDay.entry.title,
          completed: todayDay.completed,
        }
      : null,
    lastWorkout: last
      ? {
          entryId: last.entry.id,
          title: last.entry.title,
          dateLabel: `${weekdayLabel(last.entry.entryDate)} · Completed`,
          completed: true,
        }
      : null,
    streakDays: computeStreak(published),
    history,
  };
}

export function buildCoachClientProgressRow(
  clientId: string,
  clientName: string,
  days: ClientProgramDay[],
  state: ProgramsState,
): CoachClientProgressRow {
  const progress = buildClientTrainingProgress(days, state, [clientId]);
  const lastDate =
    days
      .filter((d) => d.completed)
      .sort((a, b) => b.entry.entryDate.localeCompare(a.entry.entryDate))[0]
      ?.entry.entryDate ?? null;
  const since = daysSince(lastDate);
  const { status, statusLabel } = engagementStatus(since);

  return {
    clientId,
    clientName,
    programTitle: progress.programTitle,
    completedCount: progress.completedCount,
    totalCount: progress.totalCount,
    progressPercent: progress.progressPercent,
    lastWorkoutLabel: lastDate ? formatRelativeWorkoutDay(lastDate) : "—",
    status,
    statusLabel,
  };
}

type AttentionInput = {
  clientId: string;
  clientName: string;
  days: ClientProgramDay[];
};

/**
 * Surfacing useful coach nudges from the same training data —
 * inactive athletes, programs ending soon, completed programs.
 */
export function buildCoachAttentionAlerts(
  clients: AttentionInput[],
  state: ProgramsState,
): CoachAttentionAlert[] {
  const alerts: CoachAttentionAlert[] = [];
  const today = new Date();

  for (const client of clients) {
    const lastDate =
      client.days
        .filter((d) => d.completed)
        .sort((a, b) => b.entry.entryDate.localeCompare(a.entry.entryDate))[0]
        ?.entry.entryDate ?? null;
    const since = daysSince(lastDate);
    const progress = buildClientTrainingProgress(client.days, state, [
      client.clientId,
    ]);
    const assignment = findActiveAssignment(state, [client.clientId]);
    const program = assignment?.programId
      ? state.programs.find((p) => p.id === assignment.programId)
      : null;

    const isComplete =
      assignment?.status === "completed" ||
      (progress.totalCount > 0 &&
        progress.completedCount >= progress.totalCount &&
        progress.progressPercent >= 100);

    if (isComplete) {
      alerts.push({
        id: `${client.clientId}-complete`,
        clientId: client.clientId,
        clientName: client.clientName,
        kind: "program_complete",
        reason: "Completed current program",
        href: "/admin/programs/assign",
      });
      continue;
    }

    if (since != null && since >= 5) {
      alerts.push({
        id: `${client.clientId}-inactive`,
        clientId: client.clientId,
        clientName: client.clientName,
        kind: "inactive",
        reason:
          since === 1
            ? "No workout in 1 day"
            : `No workout in ${since} days`,
        href: "/admin/clients",
      });
    }

    if (assignment && program && assignment.status === "active") {
      const end = programEndDate(assignment.startDate, program.weeks);
      const endMs = new Date(`${end}T12:00:00`).getTime();
      const left = Math.ceil(
        (endMs - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (left >= 0 && left <= 7) {
        alerts.push({
          id: `${client.clientId}-ending`,
          clientId: client.clientId,
          clientName: client.clientName,
          kind: "program_ending",
          reason:
            left === 0
              ? "Program ends today"
              : left === 1
                ? "Program expires tomorrow"
                : "Program expires next week",
          href: "/admin/programs/assign",
        });
      }
    }
  }

  const kindRank = {
    inactive: 0,
    program_ending: 1,
    program_complete: 2,
  } as const;

  return alerts.sort((a, b) => {
    if (kindRank[a.kind] !== kindRank[b.kind]) {
      return kindRank[a.kind] - kindRank[b.kind];
    }
    return a.clientName.localeCompare(b.clientName);
  });
}
