import { NextResponse } from "next/server";
import { z } from "zod";

import { createOfferingCheckout } from "@/lib/billing";
import { getOfferingBySlug } from "@/lib/billing/catalog";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { hasCapability } from "@/lib/permissions/roles";

const MEMBERSHIP_CONTACT_MESSAGE =
  "Membership changes are handled by MA5. Please contact us for assistance.";

const bodySchema = z.object({
  productSlug: z.string().min(1),
});

export async function POST(request: Request) {
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

  const offering = await getOfferingBySlug(parsed.data.productSlug, {
    activeOnly: true,
  });
  if (
    offering &&
    (offering.productType === "membership" || offering.productType === "addon") &&
    !hasCapability(sessionUser.roles, "manage_memberships")
  ) {
    return NextResponse.json({ error: MEMBERSHIP_CONTACT_MESSAGE }, { status: 403 });
  }

  const result = await createOfferingCheckout({
    productSlug: parsed.data.productSlug,
    userId: sessionUser.id,
    userEmail: sessionUser.email,
    existingCustomerId: sessionUser.profile?.stripe_customer_id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ url: result.url, sessionId: result.sessionId });
}
