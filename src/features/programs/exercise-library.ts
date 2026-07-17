import type { Exercise } from "@/features/programs/types";

/** Muscle / modality filters for the exercise picker. */
export const EXERCISE_CATEGORIES = [
  "Chest",
  "Back",
  "Shoulders",
  "Legs",
  "Hamstrings / Glutes",
  "Arms",
  "Core",
  "Plyometrics",
  "Speed & Agility",
  "Olympic Lifts",
  "Conditioning",
  "Mobility",
  "Recovery",
] as const;

export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

export function isExerciseCategory(value: string): value is ExerciseCategory {
  return (EXERCISE_CATEGORIES as readonly string[]).includes(value);
}

/** Titles grouped by category — starter generic library (~150). */
export const EXERCISE_LIBRARY_BY_CATEGORY: Record<
  ExerciseCategory,
  readonly string[]
> = {
  Chest: [
    "Barbell Bench Press",
    "Incline Barbell Bench Press",
    "Decline Bench Press",
    "Dumbbell Bench Press",
    "Incline Dumbbell Press",
    "Decline Dumbbell Press",
    "Dumbbell Fly",
    "Incline Fly",
    "Cable Fly",
    "Pec Deck Fly",
    "Push-Up",
    "Incline Push-Up",
    "Decline Push-Up",
    "Close-Grip Push-Up",
    "Chest Dip",
    "Single-Arm Cable Press",
    "Landmine Press",
  ],
  Back: [
    "Pull-Up",
    "Chin-Up",
    "Lat Pulldown",
    "Neutral-Grip Pulldown",
    "Seated Cable Row",
    "Chest Supported Row",
    "Bent Over Barbell Row",
    "Pendlay Row",
    "One Arm Dumbbell Row",
    "T-Bar Row",
    "Inverted Row",
    "Straight Arm Pulldown",
    "Face Pull",
    "Rear Delt Fly",
    "Dumbbell Pullover",
  ],
  Shoulders: [
    "Overhead Press",
    "Dumbbell Shoulder Press",
    "Arnold Press",
    "Push Press",
    "Lateral Raise",
    "Front Raise",
    "Rear Delt Fly",
    "Cuban Press",
    "Upright Row",
    "Landmine Press",
  ],
  Legs: [
    "Back Squat",
    "Front Squat",
    "Goblet Squat",
    "Bulgarian Split Squat",
    "Walking Lunge",
    "Reverse Lunge",
    "Step-Up",
    "Leg Press",
    "Hack Squat",
    "Romanian Deadlift",
    "Stiff-Leg Deadlift",
    "Conventional Deadlift",
    "Trap Bar Deadlift",
    "Hip Thrust",
    "Glute Bridge",
    "Leg Curl",
    "Leg Extension",
    "Calf Raise",
    "Seated Calf Raise",
  ],
  "Hamstrings / Glutes": [
    "Nordic Curl",
    "Good Morning",
    "Single Leg RDL",
    "Cable Pull Through",
    "Reverse Hyper",
    "Kettlebell Swing",
  ],
  Arms: [
    "Barbell Curl",
    "EZ Bar Curl",
    "Dumbbell Curl",
    "Hammer Curl",
    "Incline Curl",
    "Concentration Curl",
    "Preacher Curl",
    "Rope Curl",
    "Skull Crusher",
    "Rope Pushdown",
    "Overhead Triceps Extension",
    "Close Grip Bench Press",
    "Bench Dip",
  ],
  Core: [
    "Plank",
    "Side Plank",
    "Dead Bug",
    "Bird Dog",
    "Hanging Leg Raise",
    "Reverse Crunch",
    "Bicycle Crunch",
    "Russian Twist",
    "Pallof Press",
    "Cable Crunch",
    "Ab Wheel Rollout",
    "Mountain Climbers",
  ],
  Plyometrics: [
    "Box Jump",
    "Broad Jump",
    "Depth Jump",
    "Lateral Bounds",
    "Skater Jump",
    "Split Squat Jump",
    "Tuck Jump",
  ],
  "Speed & Agility": [
    "A Skip",
    "B Skip",
    "High Knees",
    "Butt Kicks",
    "Carioca",
    "Lateral Shuffle",
    "5-10-5 Shuttle",
    "Pro Agility",
    "Ladder Drills",
    "Cone Weave",
  ],
  "Olympic Lifts": [
    "Power Clean",
    "Hang Clean",
    "Clean Pull",
    "Snatch",
    "Hang Snatch",
    "Push Jerk",
    "Split Jerk",
    "High Pull",
  ],
  Conditioning: [
    "Battle Rope",
    "Sled Push",
    "Sled Pull",
    "Farmer Carry",
    "Sandbag Carry",
    "Assault Bike Sprint",
    "Row Erg Sprint",
    "Ski Erg",
    "Burpees",
    "Jump Rope",
  ],
  Mobility: [
    "World's Greatest Stretch",
    "Hip Flexor Stretch",
    "Couch Stretch",
    "Thoracic Rotation",
    "Cat Cow",
    "Child's Pose",
    "Band Shoulder Stretch",
    "Hamstring Stretch",
    "Adductor Rockback",
  ],
  Recovery: [
    "Foam Roll Quads",
    "Foam Roll IT Band",
    "Foam Roll Lats",
    "Lacrosse Ball Pec Release",
    "Breathing Drill",
    "Diaphragmatic Breathing",
  ],
};

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

/** Stable library id — same title in two categories gets distinct ids. */
export function libraryExerciseId(
  category: ExerciseCategory,
  title: string,
): string {
  const cat = category.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return `ex_lib_${cat}_${slugify(title)}`;
}

export function isLibraryExerciseId(id: string): boolean {
  return id.startsWith("ex_lib_");
}

const SEED_POP: Partial<Record<string, string>> = {
  "Back Squat":
    "Bar on upper back. Feet shoulder-width, toes slightly out. Brace, sit between the hips, drive up.",
  "Conventional Deadlift":
    "Bar over mid-foot. Hinge, brace, push the floor away. Keep the bar close.",
  "Pull-Up":
    "Dead hang, scap pack, pull elbows to ribs until chin clears the bar.",
  "Barbell Bench Press":
    "Feet planted, scapulae retracted. Lower with control, press evenly.",
  Plank: "Brace ribs down, glutes on, long spine. Breathe without sagging.",
};

/** Full generic library as Exercise records (not stored in the demo cookie). */
export function buildGenericExerciseLibrary(
  createdAt = "2026-01-01T00:00:00.000Z",
): Exercise[] {
  const out: Exercise[] = [];
  for (const category of EXERCISE_CATEGORIES) {
    for (const title of EXERCISE_LIBRARY_BY_CATEGORY[category]) {
      out.push({
        id: libraryExerciseId(category, title),
        title,
        category,
        pointsOfPerformance: SEED_POP[title] ?? "",
        videoSource: "none",
        videoUrl: null,
        videoStoragePath: null,
        demoPlaybackUrl: null,
        defaultParam1: "reps",
        defaultParam2: "weight_lb",
        createdAt,
      });
    }
  }
  return out;
}

/** Merge static library with cookie customs / overrides. */
export function mergeExerciseLibrary(
  cookieExercises: Exercise[] | undefined,
): Exercise[] {
  const library = buildGenericExerciseLibrary();
  const byId = new Map(library.map((e) => [e.id, e]));

  for (const raw of cookieExercises ?? []) {
    const category = isExerciseCategory(raw.category ?? "")
      ? raw.category!
      : "Legs";
    const normalized: Exercise = {
      ...raw,
      category,
      pointsOfPerformance: raw.pointsOfPerformance ?? "",
      videoSource: raw.videoSource ?? "none",
      videoUrl: raw.videoUrl ?? null,
      videoStoragePath: raw.videoStoragePath ?? null,
      demoPlaybackUrl: raw.demoPlaybackUrl ?? null,
      defaultParam1: raw.defaultParam1 ?? "reps",
      defaultParam2: raw.defaultParam2 ?? "weight_lb",
      createdAt: raw.createdAt ?? new Date().toISOString(),
    };
    byId.set(normalized.id, normalized);
  }

  return Array.from(byId.values()).sort((a, b) => {
    const ca = EXERCISE_CATEGORIES.indexOf(a.category);
    const cb = EXERCISE_CATEGORIES.indexOf(b.category);
    if (ca !== cb) return ca - cb;
    return a.title.localeCompare(b.title);
  });
}

/** Persist only customs + modified library rows (keeps cookie under size limits). */
export function dehydrateExercisesForCookie(exercises: Exercise[]): Exercise[] {
  const library = buildGenericExerciseLibrary();
  const baseById = new Map(library.map((e) => [e.id, e]));
  return exercises.filter((ex) => {
    const base = baseById.get(ex.id);
    if (!base) return true;
    return (
      ex.title !== base.title ||
      ex.category !== base.category ||
      ex.pointsOfPerformance !== base.pointsOfPerformance ||
      ex.videoSource !== base.videoSource ||
      ex.videoUrl !== base.videoUrl ||
      ex.videoStoragePath !== base.videoStoragePath ||
      ex.demoPlaybackUrl !== base.demoPlaybackUrl
    );
  });
}

export function categoryCounts(
  exercises: Exercise[],
): Record<ExerciseCategory, number> {
  const counts = Object.fromEntries(
    EXERCISE_CATEGORIES.map((c) => [c, 0]),
  ) as Record<ExerciseCategory, number>;
  for (const ex of exercises) {
    if (isExerciseCategory(ex.category)) counts[ex.category] += 1;
  }
  return counts;
}
