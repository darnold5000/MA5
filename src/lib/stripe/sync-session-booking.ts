import { createBooking } from "@/features/booking/actions";
import { getStripe } from "@/lib/stripe";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

/**
 * After paying for an individual session, create the booking as paid.
 */
export async function syncPaidSessionBooking(
  checkoutSessionId: string,
  userId: string,
) {
  const stripe = getStripe();
  if (!stripe) return null;

  const checkout = await stripe.checkout.sessions.retrieve(checkoutSessionId);
  if (checkout.payment_status !== "paid" && checkout.status !== "complete") {
    return null;
  }

  const metaUser = checkout.metadata?.user_id ?? checkout.client_reference_id;
  if (metaUser && metaUser !== userId) return null;
  if (checkout.metadata?.booking_kind !== "session") return null;

  const classSessionId = checkout.metadata?.class_session_id;
  if (!classSessionId) return null;

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient();
    const customerId =
      typeof checkout.customer === "string"
        ? checkout.customer
        : checkout.customer?.id ?? null;
    if (customerId) {
      await supabase
        .from(MA5_TABLES.profiles)
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
    }

    const { data: existing } = await supabase
      .from(MA5_TABLES.bookings)
      .select("id, confirmation_number")
      .eq("session_id", classSessionId)
      .eq("user_id", userId)
      .not("status", "in", '("cancelled","refunded")')
      .maybeSingle();

    if (existing) {
      await supabase
        .from(MA5_TABLES.bookings)
        .update({
          payment_status: "paid",
          stripe_checkout_session_id: checkoutSessionId,
        })
        .eq("id", existing.id);
      return {
        confirmationNumber: existing.confirmation_number as string,
        alreadyEnrolled: true,
      };
    }
  }

  const result = await createBooking({
    sessionId: classSessionId,
    userId,
    paymentStatus: "paid",
    stripeCheckoutSessionId: checkoutSessionId,
  });

  return {
    confirmationNumber: result.booking.confirmationNumber,
    alreadyEnrolled: false,
    demo: result.demo,
    booking: result.booking,
  };
}
