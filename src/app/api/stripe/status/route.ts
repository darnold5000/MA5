import { NextResponse } from "next/server";

import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { getStripePriceIdForProduct } from "@/lib/stripe/prices";

/**
 * Safe Stripe diagnostics for the booking demo — no secret values returned.
 */
export async function GET() {
  const secret = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
  const priceId = getStripePriceIdForProduct("sg-14") ?? "";

  const secretMode = secret.startsWith("sk_live_")
    ? "live"
    : secret.startsWith("sk_test_")
      ? "test"
      : secret
        ? "unknown"
        : "missing";

  const publishableMode = publishable.startsWith("pk_live_")
    ? "live"
    : publishable.startsWith("pk_test_")
      ? "test"
      : publishable
        ? "unknown"
        : "missing";

  let priceLookup: {
    ok: boolean;
    message?: string;
    amount?: number | null;
    currency?: string | null;
  } = { ok: false, message: "Stripe not configured" };

  if (isStripeConfigured() && priceId) {
    const stripe = getStripe();
    if (stripe) {
      try {
        const price = await stripe.prices.retrieve(priceId);
        priceLookup = {
          ok: true,
          amount: price.unit_amount,
          currency: price.currency,
        };
      } catch (err) {
        priceLookup = {
          ok: false,
          message: err instanceof Error ? err.message : "Price lookup failed",
        };
      }
    }
  } else if (!priceId) {
    priceLookup = { ok: false, message: "STRIPE_PRICE_SG_14 is not set" };
  }

  return NextResponse.json({
    secretMode,
    publishableMode,
    priceIdSet: Boolean(priceId),
    priceIdStartsWithPrice: priceId.startsWith("price_"),
    priceIdSuffix: priceId ? priceId.slice(-6) : null,
    priceLookup,
    hint:
      secretMode === "live" && priceLookup.ok === false
        ? "Vercel is using a LIVE secret key. Switch to sk_test_ from the same sandbox where the price was created."
        : secretMode === "test" && priceLookup.ok === false
          ? "Test key is loaded but price not found — key and price are from different Stripe accounts/sandboxes."
          : undefined,
  });
}
