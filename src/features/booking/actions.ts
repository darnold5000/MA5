import { isSupabaseConfigured, createClient } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";
import { getSessionById } from "@/features/scheduling/queries";
import type { BookingItem } from "@/features/scheduling/fallback-data";
import { isMa5DeploymentConfigured } from "@/lib/tenant/deployment";

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
  paymentStatus?: string;
  stripeCheckoutSessionId?: string;
}): Promise<CreateBookingResult> {
  const session = await getSessionById(input.sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  if (session.status === "full" || session.bookedCount >= session.capacity) {
    throw new Error("This session is full");
  }

  const deploymentReady = isMa5DeploymentConfigured();

  if (input.userId && isSupabaseConfigured() && session.source !== "demo") {
    try {
      const supabase = await createClient();
      const { data: existing } = await supabase
        .from(MA5_TABLES.bookings)
        .select("id, confirmation_number, status, payment_status, amount_cents")
        .eq("session_id", session.id)
        .eq("user_id", input.userId)
        .not("status", "in", '("cancelled","refunded")')
        .maybeSingle();

      if (existing) {
        throw new Error("You’re already enrolled in this session");
      }
    } catch (err) {
      if (
        err instanceof Error &&
        err.message === "You’re already enrolled in this session"
      ) {
        throw err;
      }
    }
  }

  const paymentStatus =
    input.paymentStatus ??
    (session.priceCents > 0 ? "pay_at_facility" : "not_required");

  const demoBooking: BookingItem = {
    id: `book-${Date.now()}`,
    sessionId: session.id,
    sessionTitle: session.title,
    startsAt: session.startsAt,
    confirmationNumber: confirmationNumber(),
    status: "confirmed",
    paymentStatus,
    amountCents: session.priceCents,
    source: "demo",
  };

  if (
    !input.userId ||
    !isSupabaseConfigured() ||
    session.source === "demo" ||
    !deploymentReady
  ) {
    if (deploymentReady && input.userId && session.source !== "demo") {
      throw new Error("Booking persistence requires a configured MA5 deployment");
    }
    return { booking: demoBooking, demo: true };
  }

  try {
    const supabase = await createClient();
    const confirm = confirmationNumber();
    const { data, error } = await supabase
      .from(MA5_TABLES.bookings)
      .insert({
        session_id: session.id,
        user_id: input.userId,
        confirmation_number: confirm,
        status: "confirmed",
        payment_status: paymentStatus,
        amount_cents: session.priceCents,
        stripe_checkout_session_id: input.stripeCheckoutSessionId ?? null,
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("You’re already enrolled in this session");
      }
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error("Booking was not created");
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
  } catch (err) {
    if (
      err instanceof Error &&
      err.message === "You’re already enrolled in this session"
    ) {
      throw err;
    }
    throw err instanceof Error ? err : new Error("Could not create booking");
  }
}
