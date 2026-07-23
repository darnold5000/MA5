import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import {
  DEMO_BOOKINGS_COOKIE,
  parseDemoBookingsCookie,
  serializeDemoBookings,
} from "@/features/booking/demo-store";
import { useLiveBookingsOnly } from "@/lib/booking/live-data";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

const bodySchema = z.object({
  bookingId: z.string().min(1),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { bookingId } = parsed.data;
  const session = isSupabasePublicConfigured()
    ? await getSessionUser()
    : null;

  let cancelled = false;

  const jar = await cookies();
  const existing = useLiveBookingsOnly()
    ? []
    : parseDemoBookingsCookie(jar.get(DEMO_BOOKINGS_COOKIE)?.value);
  const match = existing.find(
    (b) => b.id === bookingId || b.confirmationNumber === bookingId,
  );

  if (match?.paymentStatus === "paid") {
    return NextResponse.json(
      { error: "Online payments can’t be cancelled here. Message your coach." },
      { status: 400 },
    );
  }

  if (session && isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data: existingRow } = await supabase
        .from(MA5_TABLES.bookings)
        .select("id, payment_status")
        .eq("id", bookingId)
        .eq("user_id", session.id)
        .maybeSingle();

      if (existingRow?.payment_status === "paid") {
        return NextResponse.json(
          {
            error:
              "Online payments can’t be cancelled here. Message your coach.",
          },
          { status: 400 },
        );
      }

      if (existingRow) {
        const { data } = await supabase
          .from(MA5_TABLES.bookings)
          .update({ status: "cancelled" })
          .eq("id", bookingId)
          .eq("user_id", session.id)
          .select("id")
          .maybeSingle();
        if (data) cancelled = true;
      }
    } catch {
      // Fall through to demo cookie.
    }
  }

  const next = existing.filter(
    (b) => b.id !== bookingId && b.confirmationNumber !== bookingId,
  );

  if (match) cancelled = true;

  if (!cancelled) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: DEMO_BOOKINGS_COOKIE,
    value: serializeDemoBookings(next),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
