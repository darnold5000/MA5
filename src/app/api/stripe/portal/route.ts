import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { hasCapability } from "@/lib/permissions/roles";
import { env, isSupabasePublicConfigured } from "@/lib/env";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

const MEMBERSHIP_CONTACT_MESSAGE =
  "Membership changes are handled by MA5. Please contact us for assistance.";

export async function POST() {
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasCapability(sessionUser.roles, "manage_memberships")) {
    return NextResponse.json({ error: MEMBERSHIP_CONTACT_MESSAGE }, { status: 403 });
  }

  let customerId = sessionUser.profile?.stripe_customer_id ?? null;

  if (isSupabaseConfigured() && !customerId) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from(MA5_TABLES.profiles)
        .select("stripe_customer_id")
        .eq("id", sessionUser.id)
        .maybeSingle();
      customerId = (data?.stripe_customer_id as string | null) ?? null;
    } catch {
      // ignore
    }
  }

  if (!customerId) {
    return NextResponse.json(
      {
        error:
          "No Stripe customer yet. Complete a membership checkout first.",
      },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe unavailable" }, { status: 503 });
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${env.siteUrl}/app/profile#membership`,
  });

  return NextResponse.json({ url: portal.url });
}
