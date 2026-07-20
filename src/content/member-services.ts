/**
 * Bookable session types shown in the member Fitness Hub (Reserve).
 * Intake offerings (assessment, sports performance, InBody) stay on the marketing site.
 */

export const MEMBER_BOOKABLE_CLASS_TYPE_IDS = [
  "ct-small-group",
  "ct-semi-private",
  "ct-open-gym",
  "ct-sauna",
] as const;

export type MemberBookableClassTypeId =
  (typeof MEMBER_BOOKABLE_CLASS_TYPE_IDS)[number];

export const MEMBER_SERVICE_FILTERS = [
  { id: "all", label: "All Sessions" },
  { id: "ct-small-group", label: "Small Group" },
  { id: "ct-semi-private", label: "Semi-Private" },
  { id: "ct-open-gym", label: "Open Gym" },
  { id: "ct-sauna", label: "Sauna" },
] as const;

export function isMemberBookableClassType(classTypeId: string): boolean {
  return (MEMBER_BOOKABLE_CLASS_TYPE_IDS as readonly string[]).includes(
    classTypeId,
  );
}

export function isMemberServiceFilter(id: string): boolean {
  return MEMBER_SERVICE_FILTERS.some((f) => f.id === id);
}
