"use client";

import { createClient } from "@/lib/supabase/client";
import {
  EXERCISE_VIDEO_BUCKET,
  isAllowedVideoType,
  MAX_VIDEO_BYTES,
} from "@/lib/video/constants";
import { exerciseVideoPath } from "@/lib/tenant/storage-paths";

/** Upload straight to Supabase Storage (avoids Vercel 413 body limits). */
export async function uploadExerciseVideoFromBrowser(input: {
  exerciseId: string;
  file: File;
}): Promise<{ path: string } | { error: string }> {
  if (!isAllowedVideoType(input.file.type)) {
    return { error: "Use MP4, WebM, or MOV." };
  }
  if (input.file.size > MAX_VIDEO_BYTES) {
    return { error: "Video must be 500MB or smaller." };
  }

  const path = exerciseVideoPath(input.exerciseId, input.file.name);

  try {
    const supabase = createClient();
    const { error } = await supabase.storage
      .from(EXERCISE_VIDEO_BUCKET)
      .upload(path, input.file, {
        contentType: input.file.type,
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
