export const COMMUNITY_PLACEMENT_IDS = [
  "hero",
  "fathers-heart",
  "gatlinburg",
  "breakfast-barbells",
  "blended-church",
  "pinheads-bowling",
] as const;

export type CommunityPlacementId = (typeof COMMUNITY_PLACEMENT_IDS)[number];

export type CommunityPlacementOption = {
  id: CommunityPlacementId;
  label: string;
};

/** Admin dropdown labels for where a community photo appears on /our-community. */
export const communityPlacementOptions: CommunityPlacementOption[] = [
  { id: "hero", label: "Hero" },
  { id: "fathers-heart", label: "Father's Heart" },
  { id: "gatlinburg", label: "Gatlinburg" },
  { id: "breakfast-barbells", label: "Fall Breakfast & Barbells" },
  { id: "blended-church", label: "Blended Church" },
  { id: "pinheads-bowling", label: "Pinheads Bowling" },
];

export type CommunityEventIcon =
  | "heart"
  | "mountains"
  | "dumbbell"
  | "church"
  | "bowling";

export type CommunityEventSection = {
  id: Exclude<CommunityPlacementId, "hero">;
  icon: CommunityEventIcon;
  eyebrow: string;
  title: string;
  tagline: string;
  body: string;
  /** Alternating zigzag: image on left (even) or right (odd). */
  imageSide: "left" | "right";
};

export const communityHeroCopy = {
  eyebrow: "Community in Action",
  title: "More Than a Gym. A Family.",
  body: "At MA5 Performance, we believe lasting results are built through more than great training—they're built through meaningful relationships. From workouts and competitions to social events and giving back, we're committed to creating an environment where everyone feels welcomed, supported, and challenged to become their best.",
  cta: "Join Our Community",
  fallbackImageSrc: "/images/facility/community.png",
  fallbackImageAlt: "MA5 Performance members celebrating together at the gym",
} as const;

export const communityEventSections: CommunityEventSection[] = [
  {
    id: "fathers-heart",
    icon: "heart",
    eyebrow: "MA5 Annual",
    title: "Father's Heart Adopt-A-Child",
    tagline: "Giving back is part of who we are.",
    body: "Every holiday season, the MA5 family comes together to adopt local children and families in need. Through generous donations from our members, we provide gifts, clothing, bicycles, and essentials to help make Christmas a little brighter. At MA5, we believe strength isn't just built in the gym—it's shown through serving others.",
    imageSide: "left",
  },
  {
    id: "gatlinburg",
    icon: "mountains",
    eyebrow: "MA5 2024",
    title: "Gatlinburg Retreat",
    tagline: "Building friendships beyond the gym.",
    body: "Fitness brings us together, but community keeps us connected. Our annual Gatlinburg getaway gave members the opportunity to unplug, enjoy the outdoors, share meals, laugh together, and create lifelong friendships outside of training. Because the best communities don't stop at the gym doors.",
    imageSide: "right",
  },
  {
    id: "breakfast-barbells",
    icon: "dumbbell",
    eyebrow: "MA5 Annual",
    title: "Fall Breakfast & Barbells",
    tagline: "Fitness. Food. Fellowship.",
    body: "Every fall we take our workouts outdoors for our annual Breakfast & Barbells event. Members come together for a fun park workout followed by breakfast, conversation, and time spent connecting as a community. It's one of our favorite traditions and a reminder that fitness is meant to bring people together.",
    imageSide: "left",
  },
  {
    id: "blended-church",
    icon: "church",
    eyebrow: "MA5 2026",
    title: "The Blended Church Service",
    tagline: "Growing stronger together—in every area of life.",
    body: "At MA5, we support one another both inside and outside the gym. Our members gathered to worship together at The Blended Church, where one of our own, Pastor Damon Howe, led the service. While everyone's journey is different, we value creating opportunities to encourage one another through faith, friendship, and community.",
    imageSide: "right",
  },
  {
    id: "pinheads-bowling",
    icon: "bowling",
    eyebrow: "MA5 Member Appreciation",
    title: "Pinheads Bowling Night",
    tagline: "Celebrating the people who make MA5 special.",
    body: "Training hard deserves time to celebrate. Our Member Appreciation Bowling Night was an evening filled with laughs, friendly competition, food, and great memories. We believe relationships are just as important as results, and events like these are what make MA5 feel like family.",
    imageSide: "left",
  },
];

export const communityCtaCopy = {
  title: "Stronger Together. Better Together.",
  body: "At MA5 Performance, you'll find more than a place to train. You'll find a community that has your back.",
  cta: "Join Our Community",
} as const;

export function communityPlacementLabel(
  id: CommunityPlacementId | null | undefined,
): string {
  if (!id) return "Unassigned";
  return (
    communityPlacementOptions.find((option) => option.id === id)?.label ?? id
  );
}
