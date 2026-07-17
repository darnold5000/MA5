import { NextResponse } from "next/server";
import { z } from "zod";

import {
  newId,
  PROGRAMS_COOKIE,
  readProgramsState,
  serializeProgramsState,
} from "@/features/programs/demo-store";

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = z
    .object({
      calendarEntryId: z.string(),
      clientUserId: z.string().default("client-alex"),
      clientNote: z.string().max(2000).optional(),
    })
    .safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const state = await readProgramsState();
  const entry = state.calendarEntries.find(
    (e) => e.id === parsed.data.calendarEntryId,
  );
  if (!entry || entry.publishStatus !== "published") {
    return NextResponse.json({ error: "Workout not found" }, { status: 404 });
  }

  const existing = state.completions.findIndex(
    (c) =>
      c.calendarEntryId === parsed.data.calendarEntryId &&
      c.clientUserId === parsed.data.clientUserId,
  );

  const completion = {
    id: existing >= 0 ? state.completions[existing].id : newId("done"),
    calendarEntryId: parsed.data.calendarEntryId,
    clientUserId: parsed.data.clientUserId,
    completedAt: new Date().toISOString(),
    clientNote: parsed.data.clientNote?.trim() ?? "",
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
