import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ADMIN_OPS_COOKIE,
  mergeSessions,
  readOpsState,
  serializeOpsState,
  type AdminOpsState,
} from "@/features/admin/ops-store";
import {
  createAdminSession,
  listAdminSessionsFromDb,
  updateAdminSession,
} from "@/features/scheduling/admin-sessions";
import { requireAdminSessionOrResponse } from "@/lib/auth/session";
import { isMa5DeploymentConfigured } from "@/lib/tenant/deployment";

const createSchema = z.object({
  classTypeId: z.string().min(1),
  startsAt: z.string().min(1),
  durationMinutes: z.number().int().positive().max(480).optional(),
  capacity: z.number().int().positive().optional(),
  priceCents: z.number().int().min(0).optional(),
  coachName: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
});

const patchSchema = z.object({
  sessionId: z.string().min(1),
  title: z.string().optional(),
  startsAt: z.string().optional(),
  durationMinutes: z.number().int().positive().max(480).optional(),
  capacity: z.number().int().positive().optional(),
  priceCents: z.number().int().min(0).optional(),
  coachName: z.string().optional(),
  status: z
    .enum(["draft", "published", "full", "cancelled", "completed"])
    .optional(),
  description: z.string().optional(),
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

export async function GET() {
  const auth = await requireAdminSessionOrResponse();
  if (auth instanceof NextResponse) return auth;

  if (isMa5DeploymentConfigured()) {
    try {
      const sessions = await listAdminSessionsFromDb();
      return NextResponse.json({ sessions });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not load sessions";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const ops = await readOpsState();
  return NextResponse.json({ sessions: mergeSessions(ops) });
}

export async function POST(request: Request) {
  const auth = await requireAdminSessionOrResponse();
  if (auth instanceof NextResponse) return auth;

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid session data" }, { status: 400 });
  }

  if (isMa5DeploymentConfigured()) {
    try {
      const session = await createAdminSession(parsed.data);
      return NextResponse.json({ session, ok: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not create session";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const { createSessionDraft } = await import("@/features/admin/ops-store");
  const state = await readOpsState();
  const session = createSessionDraft(parsed.data);
  state.customSessions = [session, ...state.customSessions];
  return withOpsCookie(state, { session, ok: true });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminSessionOrResponse();
  if (auth instanceof NextResponse) return auth;

  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update" }, { status: 400 });
  }

  if (isMa5DeploymentConfigured()) {
    const { sessionId, ...changes } = parsed.data;
    try {
      await updateAdminSession({ sessionId, ...changes });
      return NextResponse.json({ ok: true, sessionId, changes });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not update session";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const state = await readOpsState();
  const { sessionId, ...changes } = parsed.data;

  function withEndsAt(
    current: { startsAt: string; durationMinutes: number; endsAt: string },
    patch: Omit<typeof changes, "sessionId">,
  ) {
    const startsAt = patch.startsAt ?? current.startsAt;
    const durationMinutes = patch.durationMinutes ?? current.durationMinutes;
    const endsAt = new Date(
      new Date(startsAt).getTime() + durationMinutes * 60_000,
    ).toISOString();
    return { ...patch, startsAt, durationMinutes, endsAt };
  }

  const customIdx = state.customSessions.findIndex((s) => s.id === sessionId);
  if (customIdx >= 0) {
    const current = state.customSessions[customIdx];
    state.customSessions[customIdx] = {
      ...current,
      ...withEndsAt(current, changes),
    };
  } else {
    const existing = mergeSessions(state).find((s) => s.id === sessionId);
    const base = existing ?? {
      startsAt: changes.startsAt ?? new Date().toISOString(),
      durationMinutes: changes.durationMinutes ?? 60,
      endsAt: new Date().toISOString(),
    };
    state.sessionPatches[sessionId] = {
      ...(state.sessionPatches[sessionId] ?? {}),
      ...withEndsAt(base, changes),
    };
  }

  return withOpsCookie(state, { ok: true, sessionId, changes });
}
