export const EXERCISE_VIDEO_BUCKET = "ma5-exercise-videos";
export const MAX_VIDEO_BYTES = 524_288_000;
export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export function isAllowedVideoType(type: string): boolean {
  return (ALLOWED_VIDEO_TYPES as readonly string[]).includes(type);
}
