import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { createBooking } from "@/features/booking/actions";
import {
  DEMO_BOOKINGS_COOKIE,
  parseDemoBookingsCookie,
  serializeDemoBookings,
} from "@/features/booking/demo-store";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";

const bodySchema = z.object({
  sessionId: z.string().min(1),
  fullName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  paymentStatus: z
    .enum([
      "not_required",
      "pending",
      "paid",
      "refunded",
      "pay_at_facility",
    ])
    .optional(),
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
    // Demo cookie path: block re-booking the same session.
    const jar = await cookies();
    const existingDemo = parseDemoBookingsCookie(
      jar.get(DEMO_BOOKINGS_COOKIE)?.value,
    );
    const alreadyDemo = existingDemo.some(
      (b) =>
        b.sessionId === parsed.data.sessionId &&
        b.status !== "cancelled" &&
        b.status !== "refunded",
    );
    if (alreadyDemo) {
      return NextResponse.json(
        { error: "You’re already enrolled in this session" },
        { status: 400 },
      );
    }

    const result = await createBooking({
      sessionId: parsed.data.sessionId,
      userId: session?.id ?? null,
      email: parsed.data.email ?? session?.email,
      fullName: parsed.data.fullName ?? session?.profile?.full_name ?? undefined,
      paymentStatus: parsed.data.paymentStatus,
    });

    const response = NextResponse.json(result);

    if (result.demo) {
      const next = [
        result.booking,
        ...existingDemo.filter((b) => b.id !== result.booking.id),
      ];
      response.cookies.set({
        name: DEMO_BOOKINGS_COOKIE,
        value: serializeDemoBookings(next),
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Booking failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
