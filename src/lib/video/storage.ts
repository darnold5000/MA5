import {
  createClient,
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import {
  ALLOWED_VIDEO_TYPES,
  EXERCISE_VIDEO_BUCKET,
  isAllowedVideoType,
  MAX_VIDEO_BYTES,
} from "@/lib/video/constants";

export {
  ALLOWED_VIDEO_TYPES,
  EXERCISE_VIDEO_BUCKET,
  isAllowedVideoType,
  MAX_VIDEO_BYTES,
};

function requireServiceClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured for video uploads.");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Set SUPABASE_SERVICE_ROLE_KEY so exercise videos can upload to Storage.",
    );
  }
  return createServiceClient();
}

/** Server-side upload (small files / scripts). Prefer browser upload for large videos. */
export async function uploadExerciseVideo(input: {
  exerciseId: string;
  file: File | Blob;
  fileName: string;
  contentType: string;
}): Promise<{ path: string } | { error: string }> {
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
    const supabase = requireServiceClient();
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
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createServiceClient();
      const { data, error } = await supabase.storage
        .from(EXERCISE_VIDEO_BUCKET)
        .createSignedUrl(path, expiresIn);
      if (!error && data?.signedUrl) return data.signedUrl;
    }
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
    const supabase = requireServiceClient();
    const { error } = await supabase.storage
      .from(EXERCISE_VIDEO_BUCKET)
      .remove([path]);
    if (error) return { error: error.message };
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Delete failed" };
  }
}
