import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

import { commerceStripeMetadata } from "@/lib/billing/catalog";
import { getSessionUser } from "@/lib/auth/session";
import { env, isSupabasePublicConfigured } from "@/lib/env";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { getSessionById } from "@/features/scheduling/queries";

const bodySchema = z.object({
  sessionId: z.string().min(1),
});

/**
 * One-time Stripe Checkout for an individual class / training session.
 */
export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 503 },
    );
  }

  const sessionUser = isSupabasePublicConfigured()
    ? await getSessionUser()
    : null;
  if (!sessionUser) {
    return NextResponse.json(
      { error: "Sign in required before paying for a session." },
      { status: 401 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const classSession = await getSessionById(parsed.data.sessionId);
  if (!classSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (classSession.priceCents <= 0) {
    return NextResponse.json(
      { error: "This session does not require payment." },
      { status: 400 },
    );
  }
  if (
    classSession.status === "full" ||
    classSession.bookedCount >= classSession.capacity
  ) {
    return NextResponse.json({ error: "This session is full" }, { status: 400 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe unavailable" }, { status: 503 });
  }

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: classSession.priceCents,
            product_data: {
              name: classSession.title,
              description: `${new Date(classSession.startsAt).toLocaleString()} · Coach ${classSession.coachName}`,
            },
          },
        },
      ],
      customer: sessionUser.profile?.stripe_customer_id ?? undefined,
      customer_email: sessionUser.profile?.stripe_customer_id
        ? undefined
        : sessionUser.email,
      client_reference_id: sessionUser.id,
      metadata: commerceStripeMetadata({
        user_id: sessionUser.id,
        class_session_id: classSession.id,
        booking_kind: "session",
      }),
      success_url: `${env.siteUrl}/api/stripe/session-paid?checkout_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.siteUrl}/app/schedule?checkout=cancelled`,
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    const message =
      err instanceof Stripe.errors.StripeError
        ? err.message
        : "Could not create Checkout session";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
