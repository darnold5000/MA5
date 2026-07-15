import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ADMIN_OPS_COOKIE,
  readOpsState,
  serializeOpsState,
  type AdminOpsState,
} from "@/features/admin/ops-store";

const createSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

const patchSchema = z.object({
  clientId: z.string().min(1),
  fullName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
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
  const state = await readOpsState();
  return NextResponse.json({ clients: state.clients });
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid client" }, { status: 400 });
  }

  const state = await readOpsState();
  const client = {
    id: `client-${Date.now()}`,
    fullName: parsed.data.fullName,
    email: parsed.data.email,
    phone: parsed.data.phone ?? "",
    status: "active" as const,
    notes: parsed.data.notes ?? "",
  };
  state.clients = [client, ...state.clients];
  return withOpsCookie(state, { ok: true, client });
}

export async function PATCH(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update" }, { status: 400 });
  }

  const state = await readOpsState();
  const idx = state.clients.findIndex((c) => c.id === parsed.data.clientId);
  if (idx < 0) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const { clientId: _id, ...changes } = parsed.data;
  state.clients[idx] = { ...state.clients[idx], ...changes };
  return withOpsCookie(state, { ok: true, client: state.clients[idx] });
}
