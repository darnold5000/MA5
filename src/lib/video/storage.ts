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
import { isMa5DeploymentConfigured } from "@/lib/tenant/deployment";
import { createMa5TenantServiceClient } from "@/lib/tenant/service";
import { exerciseVideoPath } from "@/lib/tenant/storage-paths";

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
  if (isMa5DeploymentConfigured()) {
    return createMa5TenantServiceClient().supabase;
  }
  return createServiceClient();
}

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

  const path = exerciseVideoPath(input.exerciseId, input.fileName);

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
      const supabase = isMa5DeploymentConfigured()
        ? createMa5TenantServiceClient().supabase
        : createServiceClient();
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

export { exerciseVideoPrefix } from "@/lib/tenant/storage-paths";
