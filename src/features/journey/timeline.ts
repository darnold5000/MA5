import type {
  JourneyTimelineEntry,
  MemberGoal,
  ProgressPhoto,
} from "@/features/journey/types";

export function buildTimeline(
  goals: MemberGoal[],
  photos: ProgressPhoto[],
): JourneyTimelineEntry[] {
  const entries: JourneyTimelineEntry[] = [];

  for (const goal of goals) {
    entries.push({
      id: `goal-created-${goal.id}`,
      type: "goal_created",
      title: goal.title,
      occurredAt: goal.createdAt,
    });
    if (goal.status === "completed" && goal.completedAt) {
      entries.push({
        id: `goal-completed-${goal.id}`,
        type: "goal_completed",
        title: goal.title,
        occurredAt: goal.completedAt,
      });
    }
  }

  for (const photo of photos) {
    entries.push({
      id: `photo-${photo.id}`,
      type: "photo_uploaded",
      title: "Progress photo added",
      caption: photo.caption,
      imageUrl: photo.imageUrl,
      occurredAt: photo.takenAt,
    });
  }

  return entries.sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
}
