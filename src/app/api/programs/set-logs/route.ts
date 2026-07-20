import { NextResponse } from "next/server";
import { z } from "zod";

import {
  newId,
  PROGRAMS_COOKIE,
  readProgramsState,
  serializeProgramsState,
} from "@/features/programs/demo-store";
import { mapSetLogRow } from "@/features/programs/supabase-store";
import {
  clientCanAccessCalendarEntry,
  clientCanAccessCalendarEntryInState,
} from "@/features/programs/calendar-access";
import { getSessionUser } from "@/lib/auth/session";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

const upsertSchema = z.object({
  calendarEntryId: z.string().min(1),
  workoutBlockId: z.string().min(1),
  exerciseId: z.string().min(1),
  setNumber: z.number().int().min(1),
  targetReps: z.number().int().min(0).nullable().optional(),
  reps: z.number().int().min(0).nullable().optional(),
  weightLb: z.number().min(0).max(2000).nullable().optional(),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = upsertSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const clientUserId = session.id;
  const data = parsed.data;
  const weightLb = data.weightLb ?? null;
  const reps = data.reps ?? null;
  const targetReps = data.targetReps ?? null;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data: entry, error: entryError } = await supabase
        .from(MA5_TABLES.calendarEntries)
        .select("id, publish_status, client_user_id, team_id")
        .eq("id", data.calendarEntryId)
        .maybeSingle();
      if (entryError) {
        return NextResponse.json({ error: entryError.message }, { status: 500 });
      }
      if (
        !entry ||
        !(await clientCanAccessCalendarEntry(supabase, clientUserId, entry))
      ) {
        return NextResponse.json({ error: "Workout not found" }, { status: 404 });
      }

      const { data: existing } = await supabase
        .from(MA5_TABLES.workoutSetLogs)
        .select("id")
        .eq("calendar_entry_id", data.calendarEntryId)
        .eq("client_user_id", clientUserId)
        .eq("workout_block_id", data.workoutBlockId)
        .eq("set_number", data.setNumber)
        .maybeSingle();

      const payload = {
        calendar_entry_id: data.calendarEntryId,
        client_user_id: clientUserId,
        workout_block_id: data.workoutBlockId,
        exercise_id: data.exerciseId,
        set_number: data.setNumber,
        target_reps: targetReps,
        reps,
        weight_lb: weightLb,
        logged_at: new Date().toISOString(),
      };

      if (existing) {
        const { data: row, error } = await supabase
          .from(MA5_TABLES.workoutSetLogs)
          .update(payload)
          .eq("id", existing.id)
          .select("*")
          .single();
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({
          ok: true,
          log: mapSetLogRow(row as Record<string, unknown>),
        });
      }

      const { data: row, error } = await supabase
        .from(MA5_TABLES.workoutSetLogs)
        .insert(payload)
        .select("*")
        .single();
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({
        ok: true,
        log: mapSetLogRow(row as Record<string, unknown>),
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Could not save set log" },
        { status: 500 },
      );
    }
  }

  const state = await readProgramsState();
  const entry = state.calendarEntries.find((e) => e.id === data.calendarEntryId);
  if (
    !entry ||
    !clientCanAccessCalendarEntryInState(state, clientUserId, entry)
  ) {
    return NextResponse.json({ error: "Workout not found" }, { status: 404 });
  }

  const existingIndex = state.setLogs.findIndex(
    (log) =>
      log.calendarEntryId === data.calendarEntryId &&
      log.clientUserId === clientUserId &&
      log.workoutBlockId === data.workoutBlockId &&
      log.setNumber === data.setNumber,
  );

  const log = {
    id: existingIndex >= 0 ? state.setLogs[existingIndex].id : newId("set"),
    calendarEntryId: data.calendarEntryId,
    clientUserId,
    workoutBlockId: data.workoutBlockId,
    exerciseId: data.exerciseId,
    setNumber: data.setNumber,
    targetReps,
    reps,
    weightLb,
    loggedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    state.setLogs[existingIndex] = log;
  } else {
    state.setLogs = [...state.setLogs, log];
  }

  const response = NextResponse.json({ ok: true, log });
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
