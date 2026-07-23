import type {
  MemberGoal,
  MemberJourneyData,
  ProgressPhoto,
} from "@/features/journey/types";
import { buildTimeline } from "@/features/journey/timeline";
import { JOURNEY_PHOTOS_BUCKET } from "@/lib/journey/constants";
import { isMa5DeploymentConfigured } from "@/lib/tenant/deployment";
import { createMa5TenantServiceClient } from "@/lib/tenant/service";
import { shouldUseMa5LiveData } from "@/lib/tenant/staging";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";
import { scopeToTenant } from "@/lib/tenant/query";
import { withTenantId } from "@/lib/tenant/deployment";

function journeyDb() {
  if (isMa5DeploymentConfigured()) {
    return createMa5TenantServiceClient();
  }
  return { supabase: createServiceClient(), ctx: null };
}

async function signedPhotoUrl(storagePath: string): Promise<string> {
  const { supabase } = journeyDb();
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
    if (shouldUseMa5LiveData()) {
      throw new Error("Supabase is not configured for member journey");
    }
    return { goals: [], photos: [], timeline: [] };
  }

  const { supabase, ctx } = journeyDb();
  const [{ data: goalRows, error: goalErr }, { data: photoRows, error: photoErr }] =
    await Promise.all([
      scopeToTenant(
        supabase.from(MA5_TABLES.memberGoals).select("*").eq("user_id", userId),
        ctx,
      ).order("created_at", { ascending: false }),
      scopeToTenant(
        supabase.from(MA5_TABLES.progressPhotos).select("*").eq("user_id", userId),
        ctx,
      ).order("taken_at", { ascending: false }),
    ]);

  if (goalErr || photoErr) {
    const message = goalErr?.message ?? photoErr?.message ?? "Could not load journey";
    if (shouldUseMa5LiveData()) throw new Error(message);
    return { goals: [], photos: [], timeline: [] };
  }

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
}

export async function createMemberGoal(input: {
  userId: string;
  title: string;
  targetDate?: string | null;
}) {
  const { supabase, ctx } = journeyDb();
  const row = ctx
    ? withTenantId(ctx, {
        user_id: input.userId,
        title: input.title.trim(),
        target_date: input.targetDate ?? null,
      })
    : {
        user_id: input.userId,
        title: input.title.trim(),
        target_date: input.targetDate ?? null,
      };

  const { data, error } = await supabase
    .from(MA5_TABLES.memberGoals)
    .insert(row)
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

  const { supabase, ctx } = journeyDb();
  let query = supabase
    .from(MA5_TABLES.memberGoals)
    .update(patch)
    .eq("id", input.goalId)
    .eq("user_id", input.userId);
  query = scopeToTenant(query, ctx);

  const { data, error } = await query.select("*").maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapGoal(data) : null;
}

export async function deleteMemberGoal(userId: string, goalId: string) {
  const { supabase, ctx } = journeyDb();
  let query = supabase
    .from(MA5_TABLES.memberGoals)
    .delete()
    .eq("id", goalId)
    .eq("user_id", userId);
  query = scopeToTenant(query, ctx);
  const { error } = await query;
  if (error) throw new Error(error.message);
}

export async function createProgressPhoto(input: {
  userId: string;
  storagePath: string;
  caption?: string | null;
}) {
  const { supabase, ctx } = journeyDb();
  const row = ctx
    ? withTenantId(ctx, {
        user_id: input.userId,
        storage_path: input.storagePath,
        caption: input.caption ?? null,
      })
    : {
        user_id: input.userId,
        storage_path: input.storagePath,
        caption: input.caption ?? null,
      };

  const { data, error } = await supabase
    .from(MA5_TABLES.progressPhotos)
    .insert(row)
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
  const { supabase, ctx } = journeyDb();
  let query = supabase
    .from(MA5_TABLES.progressPhotos)
    .update({ caption: input.caption })
    .eq("id", input.photoId)
    .eq("user_id", input.userId);
  query = scopeToTenant(query, ctx);

  const { data, error } = await query.select("*").maybeSingle();

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
  const { supabase, ctx } = journeyDb();
  let selectQuery = supabase
    .from(MA5_TABLES.progressPhotos)
    .select("storage_path")
    .eq("id", photoId)
    .eq("user_id", userId);
  selectQuery = scopeToTenant(selectQuery, ctx);
  const { data } = await selectQuery.maybeSingle();

  let deleteQuery = supabase
    .from(MA5_TABLES.progressPhotos)
    .delete()
    .eq("id", photoId)
    .eq("user_id", userId);
  deleteQuery = scopeToTenant(deleteQuery, ctx);
  const { error } = await deleteQuery;

  if (error) throw new Error(error.message);

  if (data?.storage_path) {
    await supabase.storage
      .from(JOURNEY_PHOTOS_BUCKET)
      .remove([data.storage_path as string]);
  }
}
