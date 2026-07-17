import { NextResponse } from "next/server";
import { z } from "zod";

import {
  DEMO_UPLOAD_SAMPLE_URL,
  materializeProgramDays,
  newId,
  PROGRAMS_COOKIE,
  readProgramsState,
  serializeProgramsState,
  type ProgramsState,
} from "@/features/programs/demo-store";
import type { Exercise, WorkoutBlockSet } from "@/features/programs/types";
import { detectVideoSourceFromUrl } from "@/lib/video/parse";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import {
  isAllowedVideoType,
  MAX_VIDEO_BYTES,
  uploadExerciseVideo,
} from "@/lib/video/storage";

function withCookie(state: ProgramsState, body: unknown, status = 200) {
  const response = NextResponse.json(body, { status });
  response.cookies.set({
    name: PROGRAMS_COOKIE,
    value: serializeProgramsState(state),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

const setSchema = z.object({
  setNumber: z.number().int().positive(),
  reps: z.number().nullable(),
  weightLb: z.number().nullable(),
});

export async function GET() {
  const state = await readProgramsState();
  return NextResponse.json(state);
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  // Multipart upload for native video
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const exerciseId = String(form.get("exerciseId") ?? "");
    const file = form.get("file");
    if (!exerciseId || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing file or exercise" }, { status: 400 });
    }
    if (!isAllowedVideoType(file.type)) {
      return NextResponse.json({ error: "Use MP4, WebM, or MOV" }, { status: 400 });
    }
    if (file.size > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: "Video too large (max 500MB)" }, { status: 400 });
    }

    const state = await readProgramsState();
    const idx = state.exercises.findIndex((e) => e.id === exerciseId);
    if (idx < 0) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    let storagePath: string | null = null;
    let demoPlaybackUrl: string | null = DEMO_UPLOAD_SAMPLE_URL;

    if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const uploaded = await uploadExerciseVideo({
        exerciseId,
        file,
        fileName: file.name,
        contentType: file.type,
      });
      if ("error" in uploaded) {
        return NextResponse.json({ error: uploaded.error }, { status: 400 });
      }
      storagePath = uploaded.path;
      demoPlaybackUrl = null;
    }

    state.exercises[idx] = {
      ...state.exercises[idx],
      videoSource: "upload",
      videoUrl: null,
      videoStoragePath: storagePath,
      demoPlaybackUrl,
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
          pointsOfPerformance: z.string().max(5000).optional(),
          videoUrl: z.string().optional(),
        })
        .parse(json);
      let videoSource: Exercise["videoSource"] = "none";
      let videoUrl: string | null = null;
      if (data.videoUrl?.trim()) {
        const provider = detectVideoSourceFromUrl(data.videoUrl);
        if (!provider) {
          return NextResponse.json(
            { error: "Video URL must be YouTube or Vimeo" },
            { status: 400 },
          );
        }
        videoSource = provider;
        videoUrl = data.videoUrl.trim();
      }
      const exercise: Exercise = {
        id: newId("ex"),
        title: data.title.trim(),
        pointsOfPerformance: data.pointsOfPerformance?.trim() ?? "",
        videoSource,
        videoUrl,
        videoStoragePath: null,
        demoPlaybackUrl: null,
        defaultParam1: "reps",
        defaultParam2: "weight_lb",
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
          pointsOfPerformance: z.string().max(5000).optional(),
          videoUrl: z.string().nullable().optional(),
          clearVideo: z.boolean().optional(),
        })
        .parse(json);
      const idx = state.exercises.findIndex((e) => e.id === data.id);
      if (idx < 0) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const current = state.exercises[idx];
      let next = { ...current };
      if (data.title !== undefined) next.title = data.title.trim();
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
            return NextResponse.json(
              { error: "Video URL must be YouTube or Vimeo" },
              { status: 400 },
            );
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
      if (idx < 0) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
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
        label: data.label ?? String.fromCharCode(65 + Math.min(existing.length, 25)),
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
      if (idx < 0) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
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
      return withCookie(state, { ok: true, program });
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
        return NextResponse.json({ error: "Already on team" }, { status: 400 });
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
        return NextResponse.json(
          { error: "Pick a client or team" },
          { status: 400 },
        );
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
        return NextResponse.json(
          { error: "Pick a client or team" },
          { status: 400 },
        );
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
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
