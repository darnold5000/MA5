import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createMemberGoal,
  deleteMemberGoal,
  updateMemberGoal,
} from "@/features/journey/queries";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  targetDate: z.string().nullable().optional(),
});

export async function GET() {
  return NextResponse.json({ error: "Use page data loader" }, { status: 405 });
}

export async function POST(request: Request) {
  if (!isSupabasePublicConfigured()) {
    return NextResponse.json({ error: "Not configured", demo: true }, { status: 503 });
  }

  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const goal = await createMemberGoal({
      userId: session.id,
      title: parsed.data.title,
      targetDate: parsed.data.targetDate ?? null,
    });
    return NextResponse.json({ goal });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not create goal" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  if (!isSupabasePublicConfigured()) {
    return NextResponse.json({ error: "Not configured", demo: true }, { status: 503 });
  }

  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = z
    .object({
      goalId: z.string().uuid(),
      title: z.string().trim().min(1).max(200).optional(),
      targetDate: z.string().nullable().optional(),
      status: z.enum(["active", "completed"]).optional(),
    })
    .safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const goal = await updateMemberGoal({
      userId: session.id,
      goalId: parsed.data.goalId,
      title: parsed.data.title,
      targetDate: parsed.data.targetDate,
      status: parsed.data.status,
    });
    return NextResponse.json({ goal });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not update goal" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!isSupabasePublicConfigured()) {
    return NextResponse.json({ error: "Not configured", demo: true }, { status: 503 });
  }

  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const goalId = searchParams.get("goalId");
  if (!goalId) {
    return NextResponse.json({ error: "goalId required" }, { status: 400 });
  }

  try {
    await deleteMemberGoal(session.id, goalId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not delete goal" },
      { status: 500 },
    );
  }
}
