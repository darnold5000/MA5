import { isSupabaseConfigured, createClient } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";
import { getSessionById } from "@/features/scheduling/queries";
import type { BookingItem } from "@/features/scheduling/fallback-data";

function confirmationNumber(): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `MA5-${n}`;
}

export type CreateBookingResult = {
  booking: BookingItem;
  demo: boolean;
};

export async function createBooking(input: {
  sessionId: string;
  userId: string | null;
  email?: string;
  fullName?: string;
}): Promise<CreateBookingResult> {
  const session = await getSessionById(input.sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  if (session.status === "full" || session.bookedCount >= session.capacity) {
    throw new Error("This session is full");
  }

  const demoBooking: BookingItem = {
    id: `book-${Date.now()}`,
    sessionId: session.id,
    sessionTitle: session.title,
    startsAt: session.startsAt,
    confirmationNumber: confirmationNumber(),
    status: "confirmed",
    paymentStatus: session.priceCents > 0 ? "pay_at_facility" : "not_required",
    amountCents: session.priceCents,
    source: "demo",
  };

  if (!input.userId || !isSupabaseConfigured() || session.source === "demo") {
    return { booking: demoBooking, demo: true };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(MA5_TABLES.bookings)
      .insert({
        session_id: session.id,
        user_id: input.userId,
        confirmation_number: demoBooking.confirmationNumber,
        status: "confirmed",
        payment_status: demoBooking.paymentStatus,
        amount_cents: session.priceCents,
      })
      .select("*")
      .single();

    if (error || !data) {
      return { booking: demoBooking, demo: true };
    }

    return {
      booking: {
        id: data.id as string,
        sessionId: data.session_id as string,
        sessionTitle: session.title,
        startsAt: session.startsAt,
        confirmationNumber: data.confirmation_number as string,
        status: data.status as string,
        paymentStatus: data.payment_status as string,
        amountCents: data.amount_cents as number,
        source: "database",
      },
      demo: false,
    };
  } catch {
    return { booking: demoBooking, demo: true };
  }
}
