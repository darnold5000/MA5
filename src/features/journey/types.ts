export type MemberGoalStatus = "active" | "completed";

export type MemberGoal = {
  id: string;
  title: string;
  targetDate: string | null;
  status: MemberGoalStatus;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProgressPhoto = {
  id: string;
  storagePath: string;
  imageUrl: string;
  caption: string | null;
  takenAt: string;
  createdAt: string;
};

export type JourneyTimelineEntry =
  | {
      id: string;
      type: "goal_created";
      title: string;
      occurredAt: string;
    }
  | {
      id: string;
      type: "goal_completed";
      title: string;
      occurredAt: string;
    }
  | {
      id: string;
      type: "photo_uploaded";
      title: string;
      caption: string | null;
      imageUrl: string;
      occurredAt: string;
    };

export type MemberJourneyData = {
  goals: MemberGoal[];
  photos: ProgressPhoto[];
  timeline: JourneyTimelineEntry[];
};
