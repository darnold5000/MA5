import { NextResponse } from "next/server";
import { z } from "zod";

import { createBooking } from "@/features/booking/actions";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";

const bodySchema = z.object({
  sessionId: z.string().min(1),
  fullName: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const session = isSupabasePublicConfigured()
    ? await getSessionUser()
    : null;

  try {
    const result = await createBooking({
      sessionId: parsed.data.sessionId,
      userId: session?.id ?? null,
      email: parsed.data.email ?? session?.email,
      fullName: parsed.data.fullName ?? session?.profile?.full_name ?? undefined,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Booking failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
