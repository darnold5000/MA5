import { NextResponse } from "next/server";
import { z } from "zod";

import {
  materializeProgramDays,
  newId,
  PROGRAMS_COOKIE,
  readProgramsState,
  serializeProgramsState,
  type ProgramsState,
} from "@/features/programs/demo-store";
import {
  programsTenantRow,
  resolveProgramsAdminGate,
  shouldUseProgramsSupabaseBackend,
} from "@/features/programs/admin-gate";
import {
  loadProgramsStateFromSupabase,
  mapAssignmentRow,
  mapCalendarRow,
  mapExerciseRow,
  mapProgramDayRow,
  mapProgramRow,
  mapTeamRow,
  mapWorkoutRow,
  materializeProgramDaysToDb,
  replaceBlockSets,
} from "@/features/programs/supabase-store";
import { upsertTeamDayWorkout } from "@/features/programs/calendar-access";
import type { Exercise, WorkoutBlock, WorkoutBlockSet } from "@/features/programs/types";
import { detectVideoSourceFromUrl } from "@/lib/video/parse";
import { MA5_TABLES } from "@/lib/supabase/tables";
import { shouldUseMa5LiveData } from "@/lib/tenant/staging";
import { exerciseVideoPrefix } from "@/lib/tenant/storage-paths";
import {
  isAllowedVideoType,
  MAX_VIDEO_BYTES,
  uploadExerciseVideo,
} from "@/lib/video/storage";

const categoryEnum = z.enum([
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
]);

const setSchema = z.object({
  setNumber: z.number().int().positive(),
  reps: z.number().nullable(),
  weightLb: z.number().nullable(),
});

const uuid = z.string().uuid();

function withCookie(state: ProgramsState, body: unknown, status = 200) {
  const value = serializeProgramsState(state);
  const cookieBytes = new TextEncoder().encode(value).length;
  const payload =
    typeof body === "object" && body !== null
      ? {
          ...body,
          ...(cookieBytes > 3500
            ? {
                cookieWarning:
                  "Demo storage is near the browser cookie limit. Keep this tab open; refresh may reset until Programs is on Supabase.",
              }
            : {}),
        }
      : body;
  const response = NextResponse.json(payload, { status });
  response.cookies.set({
    name: PROGRAMS_COOKIE,
    value,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

function jsonOk(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

async function useSupabaseBackend(): Promise<boolean> {
  return shouldUseProgramsSupabaseBackend();
}

async function getAdminSupabase() {
  return resolveProgramsAdminGate();
}

export async function GET() {
  if (await useSupabaseBackend()) {
    const gateResult = await getAdminSupabase();
    if ("error" in gateResult) return gateResult.error;
    try {
      const state = await loadProgramsStateFromSupabase(gateResult.supabase, {
        tenantId: gateResult.ctx?.tenantId,
      });
      return jsonOk(state);
    } catch (err) {
      return jsonError(
        err instanceof Error ? err.message : "Failed to load programs",
        500,
      );
    }
  }
  if (shouldUseMa5LiveData()) {
    return jsonError("Programs require Supabase on Signal Works deployment", 503);
  }
  const state = await readProgramsState();
  return jsonOk(state);
}

export async function POST(request: Request) {
  if (await useSupabaseBackend()) {
    return postSupabase(request);
  }
  if (shouldUseMa5LiveData()) {
    return jsonError("Programs require Supabase on Signal Works deployment", 503);
  }
  return postCookie(request);
}

async function postSupabase(request: Request) {
  const gateResult = await getAdminSupabase();
  if ("error" in gateResult) return gateResult.error;
  const supabase = gateResult.supabase;
  const userId = gateResult.userId;
  const tenantRow = (row: Record<string, unknown>) =>
    programsTenantRow(gateResult, row);

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const exerciseId = String(form.get("exerciseId") ?? "");
    const file = form.get("file");
    if (!exerciseId || !(file instanceof File)) {
      return jsonError("Missing file or exercise");
    }
    if (!isAllowedVideoType(file.type)) {
      return jsonError("Use MP4, WebM, or MOV");
    }
    if (file.size > MAX_VIDEO_BYTES) {
      return jsonError("Video too large (max 500MB)");
    }
    if (!uuid.safeParse(exerciseId).success) {
      return jsonError("Invalid exercise id");
    }

    const uploaded = await uploadExerciseVideo({
      exerciseId,
      file,
      fileName: file.name,
      contentType: file.type,
    });
    if ("error" in uploaded) {
      return jsonError(uploaded.error);
    }

    const { data, error } = await supabase
      .from(MA5_TABLES.exercises)
      .update({
        video_source: "upload",
        video_url: null,
        video_storage_path: uploaded.path,
      })
      .eq("id", exerciseId)
      .select("*")
      .maybeSingle();
    if (error) return jsonError(error.message, 500);
    if (!data) return jsonError("Exercise not found", 404);
    return jsonOk({
      ok: true,
      exercise: mapExerciseRow(data as Record<string, unknown>),
    });
  }

  const json = await request.json().catch(() => null);
  const action = z.string().parse(json?.action);

  try {
    switch (action) {
      case "createExercise": {
        const data = z
          .object({
            title: z.string().min(1).max(120),
            category: categoryEnum.optional(),
            defaultParam1: z.enum(["reps", "weight_lb"]).optional(),
            defaultParam2: z.enum(["reps", "weight_lb"]).optional(),
            pointsOfPerformance: z.string().max(5000).optional(),
            videoUrl: z.string().optional(),
          })
          .parse(json);
        let videoSource: Exercise["videoSource"] = "none";
        let videoUrl: string | null = null;
        if (data.videoUrl?.trim()) {
          const provider = detectVideoSourceFromUrl(data.videoUrl);
          if (!provider) {
            return jsonError("Video URL must be YouTube or Vimeo");
          }
          videoSource = provider;
          videoUrl = data.videoUrl.trim();
        }
        const { data: row, error } = await supabase
          .from(MA5_TABLES.exercises)
          .insert(
            tenantRow({
              title: data.title.trim(),
              category: data.category ?? "Legs",
              points_of_performance: data.pointsOfPerformance?.trim() ?? "",
              video_source: videoSource,
              video_url: videoUrl,
              default_param_1: data.defaultParam1 ?? "reps",
              default_param_2: data.defaultParam2 ?? "weight_lb",
              created_by: userId,
            }),
          )
          .select("*")
          .single();
        if (error) return jsonError(error.message, 500);
        return jsonOk({
          ok: true,
          exercise: mapExerciseRow(row as Record<string, unknown>),
        });
      }

      case "updateExercise": {
        const data = z
          .object({
            id: uuid,
            title: z.string().min(1).max(120).optional(),
            category: categoryEnum.optional(),
            defaultParam1: z.enum(["reps", "weight_lb"]).optional(),
            defaultParam2: z.enum(["reps", "weight_lb"]).optional(),
            pointsOfPerformance: z.string().max(5000).optional(),
            videoUrl: z.string().nullable().optional(),
            clearVideo: z.boolean().optional(),
          })
          .parse(json);
        const patch: Record<string, unknown> = {};
        if (data.title !== undefined) patch.title = data.title.trim();
        if (data.category !== undefined) patch.category = data.category;
        if (data.defaultParam1 !== undefined) {
          patch.default_param_1 = data.defaultParam1;
        }
        if (data.defaultParam2 !== undefined) {
          patch.default_param_2 = data.defaultParam2;
        }
        if (data.pointsOfPerformance !== undefined) {
          patch.points_of_performance = data.pointsOfPerformance;
        }
        if (data.clearVideo) {
          patch.video_source = "none";
          patch.video_url = null;
          patch.video_storage_path = null;
        } else if (data.videoUrl !== undefined) {
          if (!data.videoUrl?.trim()) {
            patch.video_source = "none";
            patch.video_url = null;
          } else {
            const provider = detectVideoSourceFromUrl(data.videoUrl);
            if (!provider) {
              return jsonError("Video URL must be YouTube or Vimeo");
            }
            patch.video_source = provider;
            patch.video_url = data.videoUrl.trim();
            patch.video_storage_path = null;
          }
        }
        const { data: row, error } = await supabase
          .from(MA5_TABLES.exercises)
          .update(patch)
          .eq("id", data.id)
          .select("*")
          .maybeSingle();
        if (error) return jsonError(error.message, 500);
        if (!row) return jsonError("Not found", 404);
        return jsonOk({
          ok: true,
          exercise: mapExerciseRow(row as Record<string, unknown>),
        });
      }

      case "attachExerciseVideo": {
        // Path already uploaded from the browser (avoids Vercel 413).
        const data = z
          .object({
            id: uuid,
            storagePath: z.string().min(1).max(500),
          })
          .parse(json);
        const expectedPrefix = exerciseVideoPrefix(data.id);
        if (!data.storagePath.startsWith(expectedPrefix)) {
          return jsonError("Invalid storage path for this exercise");
        }
        const { data: row, error } = await supabase
          .from(MA5_TABLES.exercises)
          .update({
            video_source: "upload",
            video_url: null,
            video_storage_path: data.storagePath,
          })
          .eq("id", data.id)
          .select("*")
          .maybeSingle();
        if (error) return jsonError(error.message, 500);
        if (!row) return jsonError("Not found", 404);
        return jsonOk({
          ok: true,
          exercise: mapExerciseRow(row as Record<string, unknown>),
        });
      }

      case "createWorkout": {
        const data = z
          .object({
            title: z.string().min(1).max(120),
            coachInstructions: z.string().max(10000).optional(),
          })
          .parse(json);
        const { data: row, error } = await supabase
          .from(MA5_TABLES.workouts)
          .insert(
            tenantRow({
              title: data.title.trim(),
              coach_instructions: data.coachInstructions?.trim() ?? "",
              created_by: userId,
            }),
          )
          .select("*")
          .single();
        if (error) return jsonError(error.message, 500);
        return jsonOk({
          ok: true,
          workout: mapWorkoutRow(row as Record<string, unknown>),
        });
      }

      case "updateWorkout": {
        const data = z
          .object({
            id: uuid,
            title: z.string().min(1).max(120).optional(),
            coachInstructions: z.string().max(10000).optional(),
          })
          .parse(json);
        const patch: Record<string, unknown> = {};
        if (data.title !== undefined) patch.title = data.title.trim();
        if (data.coachInstructions !== undefined) {
          patch.coach_instructions = data.coachInstructions;
        }
        const { data: row, error } = await supabase
          .from(MA5_TABLES.workouts)
          .update(patch)
          .eq("id", data.id)
          .select("*")
          .maybeSingle();
        if (error) return jsonError(error.message, 500);
        if (!row) return jsonError("Not found", 404);
        return jsonOk({
          ok: true,
          workout: mapWorkoutRow(row as Record<string, unknown>),
        });
      }

      case "addBlock": {
        const data = z
          .object({
            workoutId: uuid,
            exerciseId: uuid,
            label: z.string().min(1).max(8).optional(),
            sectionTitle: z.string().max(80).nullable().optional(),
            sessionCues: z.string().max(2000).optional(),
            sets: z.array(setSchema).min(1).optional(),
          })
          .parse(json);
        const { count } = await supabase
          .from(MA5_TABLES.workoutBlocks)
          .select("*", { count: "exact", head: true })
          .eq("workout_id", data.workoutId);
        const sortOrder = count ?? 0;
        const sets: WorkoutBlockSet[] =
          data.sets ??
          [1, 2, 3].map((n) => ({ setNumber: n, reps: 8, weightLb: null }));
        const { data: row, error } = await supabase
          .from(MA5_TABLES.workoutBlocks)
          .insert({
            workout_id: data.workoutId,
            exercise_id: data.exerciseId,
            sort_order: sortOrder,
            label:
              data.label ??
              String.fromCharCode(65 + Math.min(sortOrder, 25)),
            section_title: data.sectionTitle ?? null,
            session_cues: data.sessionCues ?? "",
          })
          .select("*")
          .single();
        if (error) return jsonError(error.message, 500);
        await replaceBlockSets(supabase, String(row.id), sets);
        const block: WorkoutBlock = {
          id: String(row.id),
          workoutId: data.workoutId,
          sortOrder,
          label: String(row.label),
          sectionTitle: (row.section_title as string | null) ?? null,
          exerciseId: data.exerciseId,
          sessionCues: String(row.session_cues ?? ""),
          sets,
        };
        return jsonOk({ ok: true, block });
      }

      case "updateBlock": {
        const data = z
          .object({
            id: uuid,
            exerciseId: uuid.optional(),
            sessionCues: z.string().max(2000).optional(),
            sectionTitle: z.string().max(80).nullable().optional(),
            sets: z.array(setSchema).optional(),
          })
          .parse(json);
        const patch: Record<string, unknown> = {};
        if (data.exerciseId !== undefined) patch.exercise_id = data.exerciseId;
        if (data.sessionCues !== undefined) {
          patch.session_cues = data.sessionCues;
        }
        if (data.sectionTitle !== undefined) {
          patch.section_title = data.sectionTitle;
        }
        const { data: row, error } = await supabase
          .from(MA5_TABLES.workoutBlocks)
          .update(patch)
          .eq("id", data.id)
          .select("*")
          .maybeSingle();
        if (error) return jsonError(error.message, 500);
        if (!row) return jsonError("Not found", 404);
        if (data.sets) {
          await replaceBlockSets(supabase, data.id, data.sets);
        }
        const { data: setRows } = await supabase
          .from(MA5_TABLES.workoutBlockSets)
          .select("*")
          .eq("block_id", data.id)
          .order("set_number");
        const block: WorkoutBlock = {
          id: String(row.id),
          workoutId: String(row.workout_id),
          sortOrder: Number(row.sort_order ?? 0),
          label: String(row.label ?? "A"),
          sectionTitle: (row.section_title as string | null) ?? null,
          exerciseId: String(row.exercise_id),
          sessionCues: String(row.session_cues ?? ""),
          sets: (setRows ?? []).map((s) => ({
            setNumber: Number(s.set_number),
            reps: s.reps == null ? null : Number(s.reps),
            weightLb: s.weight_lb == null ? null : Number(s.weight_lb),
          })),
        };
        return jsonOk({ ok: true, block });
      }

      case "removeBlock": {
        const data = z.object({ id: uuid }).parse(json);
        const { error } = await supabase
          .from(MA5_TABLES.workoutBlocks)
          .delete()
          .eq("id", data.id);
        if (error) return jsonError(error.message, 500);
        return jsonOk({ ok: true });
      }

      case "deleteExercise": {
        const data = z.object({ id: uuid }).parse(json);
        const { count } = await supabase
          .from(MA5_TABLES.workoutBlocks)
          .select("*", { count: "exact", head: true })
          .eq("exercise_id", data.id);
        if ((count ?? 0) > 0) {
          return jsonError(
            "Exercise is used in a workout. Remove it from blocks first.",
          );
        }
        const { error } = await supabase
          .from(MA5_TABLES.exercises)
          .delete()
          .eq("id", data.id);
        if (error) return jsonError(error.message, 500);
        return jsonOk({ ok: true });
      }

      case "deleteWorkout": {
        const data = z.object({ id: uuid }).parse(json);
        const [{ count: inProgram }, { count: inCalendar }] = await Promise.all([
          supabase
            .from(MA5_TABLES.programDays)
            .select("*", { count: "exact", head: true })
            .eq("workout_id", data.id),
          supabase
            .from(MA5_TABLES.calendarEntries)
            .select("*", { count: "exact", head: true })
            .eq("workout_id", data.id),
        ]);
        if ((inProgram ?? 0) > 0 || (inCalendar ?? 0) > 0) {
          return jsonError(
            "Workout is used in a program or calendar. Clear those references first.",
          );
        }
        const { error } = await supabase
          .from(MA5_TABLES.workouts)
          .delete()
          .eq("id", data.id);
        if (error) return jsonError(error.message, 500);
        return jsonOk({ ok: true });
      }

      case "deleteProgram": {
        const data = z.object({ id: uuid }).parse(json);
        const { error } = await supabase
          .from(MA5_TABLES.programs)
          .delete()
          .eq("id", data.id);
        if (error) return jsonError(error.message, 500);
        return jsonOk({ ok: true });
      }

      case "createProgram": {
        const data = z
          .object({
            title: z.string().min(1).max(75),
            weeks: z.number().int().min(1).max(52),
          })
          .parse(json);
        const { data: programRow, error } = await supabase
          .from(MA5_TABLES.programs)
          .insert(
            tenantRow({
              title: data.title.trim(),
              weeks: data.weeks,
              created_by: userId,
            }),
          )
          .select("*")
          .single();
        if (error) return jsonError(error.message, 500);
        const dayRows = [];
        for (let w = 1; w <= data.weeks; w++) {
          for (let d = 1; d <= 7; d++) {
            dayRows.push({
              program_id: programRow.id,
              week_index: w,
              day_index: d,
              workout_id: null,
            });
          }
        }
        const { data: days, error: dayError } = await supabase
          .from(MA5_TABLES.programDays)
          .insert(dayRows)
          .select("*");
        if (dayError) return jsonError(dayError.message, 500);
        return jsonOk({
          ok: true,
          program: mapProgramRow(programRow as Record<string, unknown>),
          programDays: (days ?? []).map((r) =>
            mapProgramDayRow(r as Record<string, unknown>),
          ),
        });
      }

      case "setProgramDayWorkout": {
        const data = z
          .object({
            programId: uuid,
            weekIndex: z.number().int().min(1),
            dayIndex: z.number().int().min(1).max(7),
            workoutId: uuid.nullable(),
          })
          .parse(json);
        const { data: existing } = await supabase
          .from(MA5_TABLES.programDays)
          .select("id")
          .eq("program_id", data.programId)
          .eq("week_index", data.weekIndex)
          .eq("day_index", data.dayIndex)
          .maybeSingle();
        if (existing) {
          const { error } = await supabase
            .from(MA5_TABLES.programDays)
            .update({ workout_id: data.workoutId })
            .eq("id", existing.id);
          if (error) return jsonError(error.message, 500);
        } else {
          const { error } = await supabase.from(MA5_TABLES.programDays).insert({
            program_id: data.programId,
            week_index: data.weekIndex,
            day_index: data.dayIndex,
            workout_id: data.workoutId,
          });
          if (error) return jsonError(error.message, 500);
        }
        return jsonOk({ ok: true });
      }

      case "createTeam": {
        const data = z
          .object({
            name: z.string().min(1).max(75),
            difficulty: z.string().max(40).optional(),
          })
          .parse(json);
        const { data: row, error } = await supabase
          .from(MA5_TABLES.teams)
          .insert(
            tenantRow({
              name: data.name.trim(),
              difficulty: data.difficulty?.trim() || null,
              created_by: userId,
            }),
          )
          .select("*")
          .single();
        if (error) return jsonError(error.message, 500);
        return jsonOk({
          ok: true,
          team: mapTeamRow(row as Record<string, unknown>),
        });
      }

      case "addTeamMember": {
        const data = z
          .object({
            teamId: uuid,
            userId: uuid,
            userName: z.string().min(1).optional(),
          })
          .parse(json);
        const { data: row, error } = await supabase
          .from(MA5_TABLES.teamMembers)
          .insert({
            team_id: data.teamId,
            user_id: data.userId,
            role: "athlete",
          })
          .select("*")
          .single();
        if (error) {
          if (error.code === "23505") {
            return jsonError("Already on team");
          }
          if (error.code === "23503") {
            return jsonError(
              "That user id is not a real profile. Use a logged-in client (step 4: roster).",
            );
          }
          return jsonError(error.message, 500);
        }
        return jsonOk({
          ok: true,
          member: {
            id: String(row.id),
            teamId: data.teamId,
            userId: data.userId,
            userName: data.userName ?? "Athlete",
            joinedAt: String(row.joined_at ?? new Date().toISOString()),
          },
        });
      }

      case "removeTeamMember": {
        const data = z.object({ id: uuid }).parse(json);
        const { error } = await supabase
          .from(MA5_TABLES.teamMembers)
          .delete()
          .eq("id", data.id);
        if (error) return jsonError(error.message, 500);
        return jsonOk({ ok: true });
      }

      case "postTodayWorkout": {
        const data = z
          .object({
            teamId: uuid,
            workoutId: uuid,
            entryDate: z.string().min(8).optional(),
          })
          .parse(json);
        const entryDate =
          data.entryDate ?? new Date().toISOString().slice(0, 10);
        const { data: workout } = await supabase
          .from(MA5_TABLES.workouts)
          .select("title")
          .eq("id", data.workoutId)
          .maybeSingle();
        const entry = await upsertTeamDayWorkout({
          supabase,
          teamId: data.teamId,
          workoutId: data.workoutId,
          entryDate,
          title: workout?.title ?? "Workout",
        });
        return jsonOk({ ok: true, entry });
      }

      case "addCalendarEntry": {
        const data = z
          .object({
            entryDate: z.string().min(8),
            workoutId: uuid,
            title: z.string().optional(),
            clientUserId: uuid.nullable().optional(),
            teamId: uuid.nullable().optional(),
            publish: z.boolean().optional(),
          })
          .parse(json);
        if (!data.clientUserId && !data.teamId) {
          return jsonError("Pick a client or team");
        }
        const { data: workout } = await supabase
          .from(MA5_TABLES.workouts)
          .select("title")
          .eq("id", data.workoutId)
          .maybeSingle();
        const { data: row, error } = await supabase
          .from(MA5_TABLES.calendarEntries)
          .insert(
            tenantRow({
              entry_date: data.entryDate,
              workout_id: data.workoutId,
              title: data.title ?? workout?.title ?? "Workout",
              publish_status: data.publish ? "published" : "draft",
              source: "library",
              client_user_id: data.clientUserId ?? null,
              team_id: data.teamId ?? null,
            }),
          )
          .select("*")
          .single();
        if (error) {
          if (error.code === "23503") {
            return jsonError(
              "Client/team must be a real profile or team UUID (step 4: roster).",
            );
          }
          return jsonError(error.message, 500);
        }
        return jsonOk({
          ok: true,
          entry: mapCalendarRow(row as Record<string, unknown>),
        });
      }

      case "publishCalendarEntries": {
        const data = z
          .object({
            ids: z.array(uuid).optional(),
            clientUserId: uuid.nullable().optional(),
            teamId: uuid.nullable().optional(),
            all: z.boolean().optional(),
          })
          .parse(json);
        if (data.ids?.length) {
          const { error } = await supabase
            .from(MA5_TABLES.calendarEntries)
            .update({ publish_status: "published" })
            .in("id", data.ids);
          if (error) return jsonError(error.message, 500);
        } else if (data.all && data.clientUserId) {
          const { error } = await supabase
            .from(MA5_TABLES.calendarEntries)
            .update({ publish_status: "published" })
            .eq("client_user_id", data.clientUserId);
          if (error) return jsonError(error.message, 500);
        } else if (data.all && data.teamId) {
          const { error } = await supabase
            .from(MA5_TABLES.calendarEntries)
            .update({ publish_status: "published" })
            .eq("team_id", data.teamId);
          if (error) return jsonError(error.message, 500);
        }
        return jsonOk({ ok: true });
      }

      case "assignProgram": {
        const data = z
          .object({
            programId: uuid,
            startDate: z.string().min(8),
            clientUserId: uuid.nullable().optional(),
            teamId: uuid.nullable().optional(),
            publish: z.boolean().optional(),
          })
          .parse(json);
        if (!data.clientUserId && !data.teamId) {
          return jsonError("Pick a client or team");
        }
        const { data: assignmentRow, error } = await supabase
          .from(MA5_TABLES.programAssignments)
          .insert(
            tenantRow({
              program_id: data.programId,
              client_user_id: data.clientUserId ?? null,
              team_id: data.teamId ?? null,
              start_date: data.startDate,
              status: "active",
            }),
          )
          .select("*")
          .single();
        if (error) {
          if (error.code === "23503") {
            return jsonError(
              "Client must be a real profile UUID (step 4: roster).",
            );
          }
          return jsonError(error.message, 500);
        }
        const state = await loadProgramsStateFromSupabase(supabase, {
          tenantId: gateResult.ctx?.tenantId,
        });
        const entries = await materializeProgramDaysToDb({
          supabase,
          programId: data.programId,
          startDate: data.startDate,
          clientUserId: data.clientUserId,
          teamId: data.teamId,
          assignmentId: String(assignmentRow.id),
          publish: data.publish ?? false,
          programDays: state.programDays,
          workoutsById: new Map(state.workouts.map((w) => [w.id, w])),
          ctx: gateResult.ctx,
        });
        return jsonOk({
          ok: true,
          assignment: mapAssignmentRow(
            assignmentRow as Record<string, unknown>,
          ),
          entries,
        });
      }

      default:
        return jsonError("Unknown action");
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid request");
    }
    return jsonError(err instanceof Error ? err.message : "Request failed", 500);
  }
}

/** Legacy cookie demo path when Supabase service role is not configured. */
async function postCookie(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const exerciseId = String(form.get("exerciseId") ?? "");
    const file = form.get("file");
    if (!exerciseId || !(file instanceof File)) {
      return jsonError("Missing file or exercise");
    }
    if (!isAllowedVideoType(file.type)) {
      return jsonError("Use MP4, WebM, or MOV");
    }
    if (file.size > MAX_VIDEO_BYTES) {
      return jsonError("Video too large (max 500MB)");
    }

    const state = await readProgramsState();
    const idx = state.exercises.findIndex((e) => e.id === exerciseId);
    if (idx < 0) {
      return jsonError("Exercise not found", 404);
    }

    const uploaded = await uploadExerciseVideo({
      exerciseId,
      file,
      fileName: file.name,
      contentType: file.type,
    });
    if ("error" in uploaded) {
      return jsonError(uploaded.error);
    }

    state.exercises[idx] = {
      ...state.exercises[idx],
      videoSource: "upload",
      videoUrl: null,
      videoStoragePath: uploaded.path,
      demoPlaybackUrl: null,
    };
    return withCookie(state, { ok: true, exercise: state.exercises[idx] });
  }

  const json = await request.json().catch(() => null);
  const action = z.string().parse(json?.action);
  const state = await readProgramsState();

  switch (action) {
    case "createExercise": {
      const data = z
        .object({
          title: z.string().min(1).max(120),
          category: categoryEnum.optional(),
          defaultParam1: z.enum(["reps", "weight_lb"]).optional(),
          defaultParam2: z.enum(["reps", "weight_lb"]).optional(),
          pointsOfPerformance: z.string().max(5000).optional(),
          videoUrl: z.string().optional(),
        })
        .parse(json);
      let videoSource: Exercise["videoSource"] = "none";
      let videoUrl: string | null = null;
      if (data.videoUrl?.trim()) {
        const provider = detectVideoSourceFromUrl(data.videoUrl);
        if (!provider) {
          return jsonError("Video URL must be YouTube or Vimeo");
        }
        videoSource = provider;
        videoUrl = data.videoUrl.trim();
      }
      const exercise: Exercise = {
        id: newId("ex"),
        title: data.title.trim(),
        category: data.category ?? "Legs",
        pointsOfPerformance: data.pointsOfPerformance?.trim() ?? "",
        videoSource,
        videoUrl,
        videoStoragePath: null,
        demoPlaybackUrl: null,
        defaultParam1: data.defaultParam1 ?? "reps",
        defaultParam2: data.defaultParam2 ?? "weight_lb",
        createdAt: new Date().toISOString(),
      };
      state.exercises = [exercise, ...state.exercises];
      return withCookie(state, { ok: true, exercise });
    }

    case "updateExercise": {
      const data = z
        .object({
          id: z.string(),
          title: z.string().min(1).max(120).optional(),
          category: categoryEnum.optional(),
          defaultParam1: z.enum(["reps", "weight_lb"]).optional(),
          defaultParam2: z.enum(["reps", "weight_lb"]).optional(),
          pointsOfPerformance: z.string().max(5000).optional(),
          videoUrl: z.string().nullable().optional(),
          clearVideo: z.boolean().optional(),
        })
        .parse(json);
      const idx = state.exercises.findIndex((e) => e.id === data.id);
      if (idx < 0) return jsonError("Not found", 404);
      const current = state.exercises[idx];
      let next = { ...current };
      if (data.title !== undefined) next.title = data.title.trim();
      if (data.category !== undefined) next.category = data.category;
      if (data.defaultParam1 !== undefined) next.defaultParam1 = data.defaultParam1;
      if (data.defaultParam2 !== undefined) next.defaultParam2 = data.defaultParam2;
      if (data.pointsOfPerformance !== undefined) {
        next.pointsOfPerformance = data.pointsOfPerformance;
      }
      if (data.clearVideo) {
        next.videoSource = "none";
        next.videoUrl = null;
        next.videoStoragePath = null;
        next.demoPlaybackUrl = null;
      } else if (data.videoUrl !== undefined) {
        if (!data.videoUrl?.trim()) {
          next.videoSource = "none";
          next.videoUrl = null;
        } else {
          const provider = detectVideoSourceFromUrl(data.videoUrl);
          if (!provider) {
            return jsonError("Video URL must be YouTube or Vimeo");
          }
          next.videoSource = provider;
          next.videoUrl = data.videoUrl.trim();
          next.videoStoragePath = null;
          next.demoPlaybackUrl = null;
        }
      }
      state.exercises[idx] = next;
      return withCookie(state, { ok: true, exercise: next });
    }

    case "createWorkout": {
      const data = z
        .object({
          title: z.string().min(1).max(120),
          coachInstructions: z.string().max(10000).optional(),
        })
        .parse(json);
      const workout = {
        id: newId("wo"),
        title: data.title.trim(),
        coachInstructions: data.coachInstructions?.trim() ?? "",
        createdAt: new Date().toISOString(),
      };
      state.workouts = [workout, ...state.workouts];
      return withCookie(state, { ok: true, workout });
    }

    case "updateWorkout": {
      const data = z
        .object({
          id: z.string(),
          title: z.string().min(1).max(120).optional(),
          coachInstructions: z.string().max(10000).optional(),
        })
        .parse(json);
      const idx = state.workouts.findIndex((w) => w.id === data.id);
      if (idx < 0) return jsonError("Not found", 404);
      state.workouts[idx] = {
        ...state.workouts[idx],
        ...(data.title !== undefined ? { title: data.title.trim() } : {}),
        ...(data.coachInstructions !== undefined
          ? { coachInstructions: data.coachInstructions }
          : {}),
      };
      return withCookie(state, { ok: true, workout: state.workouts[idx] });
    }

    case "addBlock": {
      const data = z
        .object({
          workoutId: z.string(),
          exerciseId: z.string(),
          label: z.string().min(1).max(8).optional(),
          sectionTitle: z.string().max(80).nullable().optional(),
          sessionCues: z.string().max(2000).optional(),
          sets: z.array(setSchema).min(1).optional(),
        })
        .parse(json);
      const existing = state.workoutBlocks.filter(
        (b) => b.workoutId === data.workoutId,
      );
      const sets: WorkoutBlockSet[] =
        data.sets ??
        [1, 2, 3].map((n) => ({ setNumber: n, reps: 8, weightLb: null }));
      const block = {
        id: newId("wb"),
        workoutId: data.workoutId,
        sortOrder: existing.length,
        label:
          data.label ??
          String.fromCharCode(65 + Math.min(existing.length, 25)),
        sectionTitle: data.sectionTitle ?? null,
        exerciseId: data.exerciseId,
        sessionCues: data.sessionCues ?? "",
        sets,
      };
      state.workoutBlocks = [...state.workoutBlocks, block];
      return withCookie(state, { ok: true, block });
    }

    case "updateBlock": {
      const data = z
        .object({
          id: z.string(),
          exerciseId: z.string().optional(),
          sessionCues: z.string().max(2000).optional(),
          sectionTitle: z.string().max(80).nullable().optional(),
          sets: z.array(setSchema).optional(),
        })
        .parse(json);
      const idx = state.workoutBlocks.findIndex((b) => b.id === data.id);
      if (idx < 0) return jsonError("Not found", 404);
      state.workoutBlocks[idx] = {
        ...state.workoutBlocks[idx],
        ...(data.exerciseId !== undefined
          ? { exerciseId: data.exerciseId }
          : {}),
        ...(data.sessionCues !== undefined
          ? { sessionCues: data.sessionCues }
          : {}),
        ...(data.sectionTitle !== undefined
          ? { sectionTitle: data.sectionTitle }
          : {}),
        ...(data.sets !== undefined ? { sets: data.sets } : {}),
      };
      return withCookie(state, { ok: true, block: state.workoutBlocks[idx] });
    }

    case "removeBlock": {
      const data = z.object({ id: z.string() }).parse(json);
      state.workoutBlocks = state.workoutBlocks.filter((b) => b.id !== data.id);
      return withCookie(state, { ok: true });
    }

    case "deleteExercise": {
      const data = z.object({ id: z.string() }).parse(json);
      const inUse = state.workoutBlocks.some((b) => b.exerciseId === data.id);
      if (inUse) {
        return jsonError(
          "Exercise is used in a workout. Remove it from blocks first.",
        );
      }
      state.exercises = state.exercises.filter((e) => e.id !== data.id);
      return withCookie(state, { ok: true });
    }

    case "deleteWorkout": {
      const data = z.object({ id: z.string() }).parse(json);
      const inProgram = state.programDays.some((d) => d.workoutId === data.id);
      const inCalendar = state.calendarEntries.some(
        (e) => e.workoutId === data.id,
      );
      if (inProgram || inCalendar) {
        return jsonError(
          "Workout is used in a program or calendar. Clear those references first.",
        );
      }
      state.workouts = state.workouts.filter((w) => w.id !== data.id);
      state.workoutBlocks = state.workoutBlocks.filter(
        (b) => b.workoutId !== data.id,
      );
      return withCookie(state, { ok: true });
    }

    case "deleteProgram": {
      const data = z.object({ id: z.string() }).parse(json);
      state.programs = state.programs.filter((p) => p.id !== data.id);
      state.programDays = state.programDays.filter(
        (d) => d.programId !== data.id,
      );
      state.assignments = state.assignments.filter(
        (a) => a.programId !== data.id,
      );
      return withCookie(state, { ok: true });
    }

    case "createProgram": {
      const data = z
        .object({
          title: z.string().min(1).max(75),
          weeks: z.number().int().min(1).max(52),
        })
        .parse(json);
      const program = {
        id: newId("prog"),
        title: data.title.trim(),
        weeks: data.weeks,
        createdAt: new Date().toISOString(),
      };
      const days = [];
      for (let w = 1; w <= data.weeks; w++) {
        for (let d = 1; d <= 7; d++) {
          days.push({
            id: newId("pd"),
            programId: program.id,
            weekIndex: w,
            dayIndex: d,
            workoutId: null as string | null,
          });
        }
      }
      state.programs = [program, ...state.programs];
      state.programDays = [...state.programDays, ...days];
      return withCookie(state, { ok: true, program, programDays: days });
    }

    case "setProgramDayWorkout": {
      const data = z
        .object({
          programId: z.string(),
          weekIndex: z.number().int().min(1),
          dayIndex: z.number().int().min(1).max(7),
          workoutId: z.string().nullable(),
        })
        .parse(json);
      const idx = state.programDays.findIndex(
        (d) =>
          d.programId === data.programId &&
          d.weekIndex === data.weekIndex &&
          d.dayIndex === data.dayIndex,
      );
      if (idx < 0) {
        state.programDays.push({
          id: newId("pd"),
          programId: data.programId,
          weekIndex: data.weekIndex,
          dayIndex: data.dayIndex,
          workoutId: data.workoutId,
        });
      } else {
        state.programDays[idx] = {
          ...state.programDays[idx],
          workoutId: data.workoutId,
        };
      }
      return withCookie(state, { ok: true });
    }

    case "createTeam": {
      const data = z
        .object({
          name: z.string().min(1).max(75),
          difficulty: z.string().max(40).optional(),
        })
        .parse(json);
      const team = {
        id: newId("team"),
        name: data.name.trim(),
        difficulty: data.difficulty?.trim() || null,
        createdAt: new Date().toISOString(),
      };
      state.teams = [team, ...state.teams];
      return withCookie(state, { ok: true, team });
    }

    case "addTeamMember": {
      const data = z
        .object({
          teamId: z.string(),
          userId: z.string(),
          userName: z.string().min(1),
        })
        .parse(json);
      if (
        state.teamMembers.some(
          (m) => m.teamId === data.teamId && m.userId === data.userId,
        )
      ) {
        return jsonError("Already on team");
      }
      const member = {
        id: newId("tm"),
        teamId: data.teamId,
        userId: data.userId,
        userName: data.userName,
        joinedAt: new Date().toISOString(),
      };
      state.teamMembers = [...state.teamMembers, member];
      return withCookie(state, { ok: true, member });
    }

    case "removeTeamMember": {
      const data = z.object({ id: z.string() }).parse(json);
      state.teamMembers = state.teamMembers.filter((m) => m.id !== data.id);
      return withCookie(state, { ok: true });
    }

    case "postTodayWorkout": {
      const data = z
        .object({
          teamId: z.string(),
          workoutId: z.string(),
          entryDate: z.string().min(8).optional(),
        })
        .parse(json);
      const entryDate = data.entryDate ?? new Date().toISOString().slice(0, 10);
      const workout = state.workouts.find((w) => w.id === data.workoutId);
      const existingIndex = state.calendarEntries.findIndex(
        (entry) =>
          entry.teamId === data.teamId && entry.entryDate === entryDate,
      );
      const entry = {
        id:
          existingIndex >= 0
            ? state.calendarEntries[existingIndex].id
            : newId("cal"),
        entryDate,
        workoutId: data.workoutId,
        title: workout?.title ?? "Workout",
        publishStatus: "published" as const,
        source: "library" as const,
        clientUserId: null,
        teamId: data.teamId,
        programAssignmentId: null,
      };
      if (existingIndex >= 0) {
        state.calendarEntries[existingIndex] = entry;
      } else {
        state.calendarEntries = [...state.calendarEntries, entry];
      }
      return withCookie(state, { ok: true, entry });
    }

    case "addCalendarEntry": {
      const data = z
        .object({
          entryDate: z.string().min(8),
          workoutId: z.string(),
          title: z.string().optional(),
          clientUserId: z.string().nullable().optional(),
          teamId: z.string().nullable().optional(),
          publish: z.boolean().optional(),
        })
        .parse(json);
      if (!data.clientUserId && !data.teamId) {
        return jsonError("Pick a client or team");
      }
      const workout = state.workouts.find((w) => w.id === data.workoutId);
      const entry = {
        id: newId("cal"),
        entryDate: data.entryDate,
        workoutId: data.workoutId,
        title: data.title ?? workout?.title ?? "Workout",
        publishStatus: (data.publish ? "published" : "draft") as
          | "draft"
          | "published",
        source: "library" as const,
        clientUserId: data.clientUserId ?? null,
        teamId: data.teamId ?? null,
        programAssignmentId: null,
      };
      state.calendarEntries = [...state.calendarEntries, entry];
      return withCookie(state, { ok: true, entry });
    }

    case "publishCalendarEntries": {
      const data = z
        .object({
          ids: z.array(z.string()).optional(),
          clientUserId: z.string().nullable().optional(),
          teamId: z.string().nullable().optional(),
          all: z.boolean().optional(),
        })
        .parse(json);
      state.calendarEntries = state.calendarEntries.map((e) => {
        const matchIds = data.ids?.includes(e.id);
        const matchClient =
          data.all &&
          data.clientUserId &&
          e.clientUserId === data.clientUserId;
        const matchTeam =
          data.all && data.teamId && e.teamId === data.teamId;
        if (matchIds || matchClient || matchTeam) {
          return { ...e, publishStatus: "published" as const };
        }
        return e;
      });
      return withCookie(state, { ok: true });
    }

    case "assignProgram": {
      const data = z
        .object({
          programId: z.string(),
          startDate: z.string().min(8),
          clientUserId: z.string().nullable().optional(),
          teamId: z.string().nullable().optional(),
          publish: z.boolean().optional(),
        })
        .parse(json);
      if (!data.clientUserId && !data.teamId) {
        return jsonError("Pick a client or team");
      }
      const assignment = {
        id: newId("asg"),
        programId: data.programId,
        clientUserId: data.clientUserId ?? null,
        teamId: data.teamId ?? null,
        startDate: data.startDate,
        status: "active" as const,
      };
      const entries = materializeProgramDays({
        state,
        programId: data.programId,
        startDate: data.startDate,
        clientUserId: data.clientUserId,
        teamId: data.teamId,
        assignmentId: assignment.id,
        publish: data.publish ?? false,
      });
      state.assignments = [assignment, ...state.assignments];
      state.calendarEntries = [...state.calendarEntries, ...entries];
      return withCookie(state, { ok: true, assignment, entries });
    }

    default:
      return jsonError("Unknown action");
  }
}
