import { NextResponse } from "next/server";

import { listActiveOfferings } from "@/lib/billing/catalog";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

/**
 * Safe Stripe diagnostics — no secret values returned.
 */
export async function GET() {
  const secret = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";

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

  let offeringsLinked = 0;
  let samplePriceId: string | null = null;

  try {
    const offerings = await listActiveOfferings();
    offeringsLinked = offerings.filter((o) => o.currentStripePriceId).length;
    samplePriceId =
      offerings.find((o) => o.currentStripePriceId)?.currentStripePriceId ??
      null;
  } catch {
    // catalog unavailable
  }

  let priceLookup: {
    ok: boolean;
    message?: string;
    amount?: number | null;
    currency?: string | null;
  } = { ok: false, message: "Stripe not configured" };

  if (isStripeConfigured() && samplePriceId) {
    const stripe = getStripe();
    if (stripe) {
      try {
        const price = await stripe.prices.retrieve(samplePriceId);
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
  } else if (!samplePriceId) {
    priceLookup = {
      ok: false,
      message:
        "No offerings with Stripe Price IDs. Open Admin → Offerings and sync.",
    };
  }

  return NextResponse.json({
    secretMode,
    publishableMode,
    offeringsLinked,
    priceIdSet: Boolean(samplePriceId),
    priceIdStartsWithPrice: samplePriceId?.startsWith("price_") ?? false,
    priceIdSuffix: samplePriceId ? samplePriceId.slice(-6) : null,
    priceLookup,
    hint:
      secretMode === "live" && priceLookup.ok === false
        ? "Vercel is using a LIVE secret key. Switch to sk_test_ for demos."
        : secretMode === "test" && priceLookup.ok === false
          ? "Test key is loaded but catalog price not found — sync offerings from Admin → Offerings."
          : undefined,
  });
}
