import { NextResponse } from "next/server";
import { z } from "zod";

import {
  newId,
  PROGRAMS_COOKIE,
  readProgramsState,
  serializeProgramsState,
} from "@/features/programs/demo-store";
import { mapCompletionRow } from "@/features/programs/supabase-store";
import {
  clientCanAccessCalendarEntry,
  clientCanAccessCalendarEntryInState,
} from "@/features/programs/calendar-access";
import { getSessionUser } from "@/lib/auth/session";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";
import { isMa5DeploymentConfigured } from "@/lib/tenant/deployment";
import { withTenantId } from "@/lib/tenant/deployment";
import { requireMa5DeploymentContext } from "@/lib/tenant/deployment";
import { shouldUseMa5LiveData } from "@/lib/tenant/staging";

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = z
    .object({
      calendarEntryId: z.string().min(1),
      clientNote: z.string().max(2000).optional(),
    })
    .safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const clientUserId = session.id;
  const note = parsed.data.clientNote?.trim() ?? "";

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data: entry, error: entryError } = await supabase
        .from(MA5_TABLES.calendarEntries)
        .select("id, publish_status, client_user_id, team_id")
        .eq("id", parsed.data.calendarEntryId)
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
        .from(MA5_TABLES.workoutCompletions)
        .select("id")
        .eq("calendar_entry_id", parsed.data.calendarEntryId)
        .eq("client_user_id", clientUserId)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from(MA5_TABLES.workoutCompletions)
          .update({
            completed_at: new Date().toISOString(),
            client_note: note,
          })
          .eq("id", existing.id)
          .select("*")
          .single();
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({
          ok: true,
          completion: mapCompletionRow(data as Record<string, unknown>),
        });
      }

      const completionBase = {
        calendar_entry_id: parsed.data.calendarEntryId,
        client_user_id: clientUserId,
        client_note: note,
      };
      const completionRow = isMa5DeploymentConfigured()
        ? withTenantId(requireMa5DeploymentContext(), completionBase)
        : completionBase;

      const { data, error } = await supabase
        .from(MA5_TABLES.workoutCompletions)
        .insert(completionRow)
        .select("*")
        .single();
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({
        ok: true,
        completion: mapCompletionRow(data as Record<string, unknown>),
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Could not complete" },
        { status: 500 },
      );
    }
  }

  if (shouldUseMa5LiveData()) {
    return NextResponse.json(
      { error: "Workout completion requires Supabase on Signal Works deployment" },
      { status: 503 },
    );
  }

  // Cookie fallback (local demos without Supabase)
  const state = await readProgramsState();
  const entry = state.calendarEntries.find(
    (e) => e.id === parsed.data.calendarEntryId,
  );
  if (
    !entry ||
    !clientCanAccessCalendarEntryInState(state, clientUserId, entry)
  ) {
    return NextResponse.json({ error: "Workout not found" }, { status: 404 });
  }

  const existing = state.completions.findIndex(
    (c) =>
      c.calendarEntryId === parsed.data.calendarEntryId &&
      c.clientUserId === clientUserId,
  );

  const completion = {
    id: existing >= 0 ? state.completions[existing].id : newId("done"),
    calendarEntryId: parsed.data.calendarEntryId,
    clientUserId,
    completedAt: new Date().toISOString(),
    clientNote: note,
  };

  if (existing >= 0) {
    state.completions[existing] = completion;
  } else {
    state.completions = [...state.completions, completion];
  }

  const response = NextResponse.json({ ok: true, completion });
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
