import type {
  MemberGoal,
  MemberJourneyData,
  ProgressPhoto,
} from "@/features/journey/types";
import { buildTimeline } from "@/features/journey/timeline";
import { JOURNEY_PHOTOS_BUCKET } from "@/lib/journey/constants";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

async function signedPhotoUrl(storagePath: string): Promise<string> {
  const supabase = createServiceClient();
  const { data } = await supabase.storage
    .from(JOURNEY_PHOTOS_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);
  return data?.signedUrl ?? "";
}

function mapGoal(row: Record<string, unknown>): MemberGoal {
  return {
    id: row.id as string,
    title: row.title as string,
    targetDate: (row.target_date as string | null) ?? null,
    status: row.status as MemberGoal["status"],
    completedAt: (row.completed_at as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getMemberJourney(userId: string): Promise<MemberJourneyData> {
  if (!isSupabaseConfigured()) {
    return { goals: [], photos: [], timeline: [] };
  }

  try {
    const supabase = createServiceClient();
    const [{ data: goalRows }, { data: photoRows }] = await Promise.all([
      supabase
        .from(MA5_TABLES.memberGoals)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from(MA5_TABLES.progressPhotos)
        .select("*")
        .eq("user_id", userId)
        .order("taken_at", { ascending: false }),
    ]);

    const goals = (goalRows ?? []).map((row) => mapGoal(row));
    const photos: ProgressPhoto[] = await Promise.all(
      (photoRows ?? []).map(async (row) => ({
        id: row.id as string,
        storagePath: row.storage_path as string,
        imageUrl: await signedPhotoUrl(row.storage_path as string),
        caption: (row.caption as string | null) ?? null,
        takenAt: row.taken_at as string,
        createdAt: row.created_at as string,
      })),
    );

    return {
      goals,
      photos,
      timeline: buildTimeline(goals, photos),
    };
  } catch {
    return { goals: [], photos: [], timeline: [] };
  }
}

export async function createMemberGoal(input: {
  userId: string;
  title: string;
  targetDate?: string | null;
}) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from(MA5_TABLES.memberGoals)
    .insert({
      user_id: input.userId,
      title: input.title.trim(),
      target_date: input.targetDate ?? null,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not create goal");
  return mapGoal(data);
}

export async function updateMemberGoal(input: {
  userId: string;
  goalId: string;
  title?: string;
  targetDate?: string | null;
  status?: MemberGoal["status"];
}) {
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.targetDate !== undefined) patch.target_date = input.targetDate;
  if (input.status !== undefined) {
    patch.status = input.status;
    patch.completed_at =
      input.status === "completed" ? new Date().toISOString() : null;
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from(MA5_TABLES.memberGoals)
    .update(patch)
    .eq("id", input.goalId)
    .eq("user_id", input.userId)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapGoal(data) : null;
}

export async function deleteMemberGoal(userId: string, goalId: string) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from(MA5_TABLES.memberGoals)
    .delete()
    .eq("id", goalId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function createProgressPhoto(input: {
  userId: string;
  storagePath: string;
  caption?: string | null;
}) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from(MA5_TABLES.progressPhotos)
    .insert({
      user_id: input.userId,
      storage_path: input.storagePath,
      caption: input.caption ?? null,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not save photo");

  return {
    id: data.id as string,
    storagePath: data.storage_path as string,
    imageUrl: await signedPhotoUrl(data.storage_path as string),
    caption: (data.caption as string | null) ?? null,
    takenAt: data.taken_at as string,
    createdAt: data.created_at as string,
  };
}

export async function updateProgressPhotoCaption(input: {
  userId: string;
  photoId: string;
  caption: string | null;
}) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from(MA5_TABLES.progressPhotos)
    .update({ caption: input.caption })
    .eq("id", input.photoId)
    .eq("user_id", input.userId)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id as string,
    storagePath: data.storage_path as string,
    imageUrl: await signedPhotoUrl(data.storage_path as string),
    caption: (data.caption as string | null) ?? null,
    takenAt: data.taken_at as string,
    createdAt: data.created_at as string,
  };
}

export async function deleteProgressPhoto(userId: string, photoId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from(MA5_TABLES.progressPhotos)
    .select("storage_path")
    .eq("id", photoId)
    .eq("user_id", userId)
    .maybeSingle();

  const { error } = await supabase
    .from(MA5_TABLES.progressPhotos)
    .delete()
    .eq("id", photoId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  if (data?.storage_path) {
    await supabase.storage
      .from(JOURNEY_PHOTOS_BUCKET)
      .remove([data.storage_path as string]);
  }
}
