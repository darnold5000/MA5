import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ADMIN_OPS_COOKIE,
  mergeSessions,
  readOpsState,
  serializeOpsState,
  type AdminOpsState,
} from "@/features/admin/ops-store";

const addSchema = z.object({
  sessionId: z.string().min(1),
  clientName: z.string().min(1),
  clientEmail: z.string().email().optional(),
});

const updateSchema = z.object({
  bookingId: z.string().min(1),
  status: z.enum([
    "pending",
    "confirmed",
    "cancelled",
    "waitlisted",
    "attended",
    "no_show",
    "refunded",
  ]),
});

const removeSchema = z.object({
  bookingId: z.string().min(1),
});

function withOpsCookie(state: AdminOpsState, body: unknown) {
  const response = NextResponse.json(body);
  response.cookies.set({
    name: ADMIN_OPS_COOKIE,
    value: serializeOpsState(state),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

function bumpBookedCount(state: AdminOpsState, sessionId: string, delta: number) {
  const sessions = mergeSessions(state);
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return;

  const nextCount = Math.max(0, session.bookedCount + delta);
  const customIdx = state.customSessions.findIndex((s) => s.id === sessionId);
  if (customIdx >= 0) {
    state.customSessions[customIdx] = {
      ...state.customSessions[customIdx],
      bookedCount: nextCount,
      status:
        nextCount >= state.customSessions[customIdx].capacity
          ? "full"
          : state.customSessions[customIdx].status === "full"
            ? "published"
            : state.customSessions[customIdx].status,
    };
  } else {
    state.sessionPatches[sessionId] = {
      ...(state.sessionPatches[sessionId] ?? {}),
      bookedCount: nextCount,
      status:
        nextCount >= session.capacity
          ? "full"
          : session.status === "full"
            ? "published"
            : session.status,
    };
  }
}

export async function GET() {
  const state = await readOpsState();
  return NextResponse.json({ roster: state.roster });
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = addSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid roster entry" }, { status: 400 });
  }

  const state = await readOpsState();
  const sessions = mergeSessions(state);
  const session = sessions.find((s) => s.id === parsed.data.sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.bookedCount >= session.capacity || session.status === "full") {
    return NextResponse.json({ error: "Session is full" }, { status: 400 });
  }

  const entry = {
    id: `roster-${Date.now()}`,
    sessionId: session.id,
    sessionTitle: session.title,
    startsAt: session.startsAt,
    confirmationNumber: `MA5-${Math.floor(1000 + Math.random() * 9000)}`,
    status: "confirmed",
    paymentStatus: session.priceCents > 0 ? "pay_at_facility" : "not_required",
    amountCents: session.priceCents,
    source: "demo" as const,
    clientName: parsed.data.clientName,
    clientEmail: parsed.data.clientEmail ?? "",
  };

  state.roster = [entry, ...state.roster];
  bumpBookedCount(state, session.id, 1);
  return withOpsCookie(state, { ok: true, entry });
}

export async function PATCH(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update" }, { status: 400 });
  }

  const state = await readOpsState();
  const idx = state.roster.findIndex((r) => r.id === parsed.data.bookingId);
  if (idx < 0) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const prev = state.roster[idx].status;
  state.roster[idx] = { ...state.roster[idx], status: parsed.data.status };

  if (prev !== "cancelled" && parsed.data.status === "cancelled") {
    bumpBookedCount(state, state.roster[idx].sessionId, -1);
  }
  if (prev === "cancelled" && parsed.data.status !== "cancelled") {
    bumpBookedCount(state, state.roster[idx].sessionId, 1);
  }

  return withOpsCookie(state, { ok: true, entry: state.roster[idx] });
}

export async function DELETE(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = removeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const state = await readOpsState();
  const entry = state.roster.find((r) => r.id === parsed.data.bookingId);
  if (!entry) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (entry.status !== "cancelled") {
    bumpBookedCount(state, entry.sessionId, -1);
  }
  state.roster = state.roster.filter((r) => r.id !== parsed.data.bookingId);
  return withOpsCookie(state, { ok: true });
}
