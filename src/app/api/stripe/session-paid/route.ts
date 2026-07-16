import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  DEMO_BOOKINGS_COOKIE,
  parseDemoBookingsCookie,
  serializeDemoBookings,
} from "@/features/booking/demo-store";
import { getSessionUser } from "@/lib/auth/session";
import { env, isSupabasePublicConfigured } from "@/lib/env";
import { syncPaidSessionBooking } from "@/lib/stripe/sync-session-booking";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const checkoutSessionId = url.searchParams.get("checkout_session_id");
  const site = env.siteUrl;

  if (!checkoutSessionId) {
    return NextResponse.redirect(`${site}/app/bookings`);
  }

  const sessionUser = isSupabasePublicConfigured()
    ? await getSessionUser()
    : null;

  if (!sessionUser) {
    return NextResponse.redirect(`${site}/login?next=/app/bookings`);
  }

  try {
    const synced = await syncPaidSessionBooking(
      checkoutSessionId,
      sessionUser.id,
    );

    const response = NextResponse.redirect(
      `${site}/app/bookings?paid=1${
        synced?.confirmationNumber
          ? `&booked=${encodeURIComponent(synced.confirmationNumber)}`
          : ""
      }`,
    );

    if (synced && "demo" in synced && synced.demo && synced.booking) {
      const jar = await cookies();
      const existing = parseDemoBookingsCookie(
        jar.get(DEMO_BOOKINGS_COOKIE)?.value,
      );
      const next = [
        synced.booking,
        ...existing.filter((b) => b.id !== synced.booking!.id),
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
  } catch {
    return NextResponse.redirect(`${site}/app/bookings?paid=1`);
  }
}
