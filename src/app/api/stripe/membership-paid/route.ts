import { NextResponse } from "next/server";

import { syncOfferingCheckoutSessionById } from "@/lib/billing/sync-offering-checkout";
import { getSessionUser } from "@/lib/auth/session";
import { env, isSupabasePublicConfigured } from "@/lib/env";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const checkoutSessionId = url.searchParams.get("checkout_session_id");
  const site = env.siteUrl;

  if (!checkoutSessionId) {
    return NextResponse.redirect(`${site}/app/profile#membership`);
  }

  const sessionUser = isSupabasePublicConfigured()
    ? await getSessionUser()
    : null;

  if (!sessionUser) {
    return NextResponse.redirect(
      `${site}/login?next=${encodeURIComponent(
        `/api/stripe/membership-paid?checkout_session_id=${checkoutSessionId}`,
      )}`,
    );
  }

  const result = await syncOfferingCheckoutSessionById(
    checkoutSessionId,
    sessionUser.id,
  );

  const profileUrl = new URL(`${site}/app/profile`);
  profileUrl.hash = "membership";
  if (result.ok) {
    profileUrl.searchParams.set("checkout", "synced");
  } else {
    profileUrl.searchParams.set("checkout", "sync_failed");
    profileUrl.searchParams.set(
      "checkout_error",
      result.error.slice(0, 120),
    );
  }

  return NextResponse.redirect(profileUrl.toString());
}
