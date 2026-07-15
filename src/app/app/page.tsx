import type { Metadata } from "next";
import Link from "next/link";

import { StatusBanner } from "@/components/platform/status-banner";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { isStripeConfigured } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Client dashboard",
  robots: { index: false, follow: false },
};

export default async function ClientDashboardPage() {
  const configured = isSupabasePublicConfigured();
  const session = configured ? await getSessionUser() : null;
  const stripeReady = isStripeConfigured();

  return (
    <div className="space-y-6">
      <StatusBanner title="Mindbody replacement demo">
        This portal books classes and sells memberships on MA5 infrastructure.
        Marketing pages still look the same. Mindbody Explore remains available
        as a fallback link until cutover.
      </StatusBanner>

      {!configured ? (
        <StatusBanner tone="warning" title="Running on demo data">
          Supabase is not connected, so schedule and bookings use built-in demo
          data. Wire env vars + migrations to persist real bookings.
        </StatusBanner>
      ) : null}

      {!stripeReady ? (
        <StatusBanner tone="warning" title="Stripe not connected">
          Membership checkout buttons show catalog pricing but Checkout needs{" "}
          <code>STRIPE_SECRET_KEY</code> and <code>STRIPE_PRICE_*</code> IDs.
        </StatusBanner>
      ) : null}

      <section className="border border-border bg-surface p-6">
        <h2 className="font-display text-2xl tracking-wide uppercase">
          Welcome
          {session?.profile?.full_name ? `, ${session.profile.full_name}` : ""}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {session
            ? `Signed in as ${session.email}.`
            : "Browse the schedule and book demo spots without signing in. Sign in unlocks Stripe membership checkout."}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/app/schedule"
            className="inline-flex min-h-11 items-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase"
          >
            View schedule
          </Link>
          <Link
            href="/app/billing"
            className="inline-flex min-h-11 items-center border border-border px-5 text-xs font-semibold tracking-wide uppercase"
          >
            Memberships
          </Link>
          <a
            href="https://www.mindbodyonline.com/explore/locations/ma5fitness-llc"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center border border-border px-5 text-xs font-semibold tracking-wide uppercase"
          >
            Mindbody fallback
          </a>
        </div>
      </section>
    </div>
  );
}
