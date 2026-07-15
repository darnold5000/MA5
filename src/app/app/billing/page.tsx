import type { Metadata } from "next";

import { CheckoutButton } from "@/components/billing/checkout-button";
import { ManageBillingButton } from "@/components/billing/manage-billing-button";
import { StatusBanner } from "@/components/platform/status-banner";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { isStripeConfigured } from "@/lib/stripe";
import {
  formatMoney,
  listProducts,
  listUserMemberships,
} from "@/features/scheduling/queries";

export const metadata: Metadata = {
  title: "Billing",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ checkout?: string }>;
};

export default async function BillingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const configured = isSupabasePublicConfigured();
  const session = configured ? await getSessionUser() : null;
  const products = await listProducts();
  const memberships = await listUserMemberships(session?.id ?? null);
  const stripeReady = isStripeConfigured();

  const membershipsOnly = products.filter(
    (p) => p.productType === "membership" || p.productType === "addon",
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-3xl tracking-wide uppercase">
          Memberships & billing
        </h2>
        <p className="mt-2 text-sm text-muted">
          Prices match the public Mindbody catalog. Checkout uses Stripe when
          configured.
        </p>
      </div>

      {params.checkout === "success" ? (
        <StatusBanner title="Checkout complete">
          Thanks — your membership purchase is processing. Active status appears
          after the Stripe webhook syncs (when Supabase is connected).
        </StatusBanner>
      ) : null}

      {!stripeReady ? (
        <StatusBanner tone="warning" title="Stripe not configured">
          Catalog is visible for evaluation. Checkout returns an error until
          Stripe keys and Price IDs are added.
        </StatusBanner>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-xl tracking-wide uppercase">
            Your memberships
          </h3>
          <ManageBillingButton />
        </div>
        {memberships.length === 0 ? (
          <p className="text-sm text-muted">No active memberships on file.</p>
        ) : (
          memberships.map((m) => (
            <div key={m.id} className="border border-border bg-surface p-4">
              <p className="font-display text-lg uppercase">{m.productName}</p>
              <p className="text-sm text-muted">Status: {m.status}</p>
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-xl tracking-wide uppercase">
          Available plans
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          {membershipsOnly.map((product) => (
            <article
              key={product.id}
              className="flex flex-col justify-between gap-4 border border-border bg-surface p-5"
            >
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
                  {product.productType}
                </p>
                <h4 className="mt-1 font-display text-xl tracking-wide uppercase">
                  {product.name}
                </h4>
                <p className="mt-2 text-sm text-muted">{product.description}</p>
                <p className="mt-3 text-lg">
                  {formatMoney(product.priceCents)}
                  {product.billingInterval === "month" ? (
                    <span className="text-sm text-muted"> / month</span>
                  ) : null}
                </p>
              </div>
              <CheckoutButton
                productSlug={product.slug}
                label={
                  product.billingInterval === "month"
                    ? "Start membership"
                    : "Buy"
                }
                disabled={!session}
              />
              {!session ? (
                <p className="text-xs text-muted">Sign in to checkout.</p>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
