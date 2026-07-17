import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

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

export async function uploadExerciseVideo(input: {
  exerciseId: string;
  file: File | Blob;
  fileName: string;
  contentType: string;
}): Promise<{ path: string } | { error: string }> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured for video uploads." };
  }
  if (!isAllowedVideoType(input.contentType)) {
    return { error: "Use MP4, WebM, or MOV." };
  }
  if (input.file.size > MAX_VIDEO_BYTES) {
    return { error: "Video must be 500MB or smaller." };
  }

  const ext =
    input.fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
    "mp4";
  const path = `exercises/${input.exerciseId}/${crypto.randomUUID()}.${ext}`;

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.storage
      .from(EXERCISE_VIDEO_BUCKET)
      .upload(path, input.file, {
        contentType: input.contentType,
        upsert: false,
      });
    if (error) return { error: error.message };
    return { path };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Upload failed",
    };
  }
}

export async function createSignedVideoUrl(
  path: string,
  expiresIn = 3600,
): Promise<string | null> {
  if (!isSupabaseConfigured() || !path) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from(EXERCISE_VIDEO_BUCKET)
      .createSignedUrl(path, expiresIn);
    if (error) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

export async function deleteExerciseVideo(
  path: string,
): Promise<{ error?: string }> {
  if (!isSupabaseConfigured() || !path) return {};
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.storage
      .from(EXERCISE_VIDEO_BUCKET)
      .remove([path]);
    if (error) return { error: error.message };
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Delete failed" };
  }
}
