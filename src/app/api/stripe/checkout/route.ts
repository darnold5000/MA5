import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

import { getCatalogProducts } from "@/features/memberships/catalog";
import { getSessionUser } from "@/lib/auth/session";
import { env, isSupabasePublicConfigured } from "@/lib/env";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { getStripePriceIdForProduct } from "@/lib/stripe/prices";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

const bodySchema = z.object({
  productSlug: z.string().min(1),
});

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured. Add STRIPE_SECRET_KEY to enable Checkout." },
      { status: 503 },
    );
  }

  const sessionUser = isSupabasePublicConfigured()
    ? await getSessionUser()
    : null;
  if (!sessionUser) {
    return NextResponse.json(
      { error: "Sign in required before checkout." },
      { status: 401 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const product = getCatalogProducts().find(
    (p) => p.slug === parsed.data.productSlug,
  );
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const priceId = getStripePriceIdForProduct(product.slug);
  if (!priceId) {
    return NextResponse.json(
      {
        error: `Stripe Price ID missing for "${product.slug}". Add the matching STRIPE_PRICE_* env var.`,
      },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe unavailable" }, { status: 503 });
  }

  let customerId = sessionUser.profile?.stripe_customer_id ?? undefined;

  if (isSupabaseConfigured() && !customerId) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from(MA5_TABLES.profiles)
        .select("stripe_customer_id")
        .eq("id", sessionUser.id)
        .maybeSingle();
      customerId = (data?.stripe_customer_id as string | null) ?? undefined;
    } catch {
      // continue without existing customer
    }
  }

  const mode =
    product.billingInterval === "month" ? "subscription" : "payment";

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      customer: customerId,
      customer_email: customerId ? undefined : sessionUser.email,
      client_reference_id: sessionUser.id,
      metadata: {
        user_id: sessionUser.id,
        product_slug: product.slug,
      },
      ...(mode === "subscription"
        ? {
            subscription_data: {
              metadata: {
                user_id: sessionUser.id,
                product_slug: product.slug,
              },
            },
          }
        : {}),
      success_url: `${env.siteUrl}/app/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.siteUrl}/app/billing?checkout=cancelled`,
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
