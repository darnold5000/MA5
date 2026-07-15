import type { Metadata } from "next";

import { CheckoutButton } from "@/components/billing/checkout-button";
import { ManageBillingButton } from "@/components/billing/manage-billing-button";
import { demoClient } from "@/content/demo-persona";
import { formatMoney, listProducts } from "@/features/scheduling/queries";

export const metadata: Metadata = {
  title: "Membership",
  robots: { index: false, follow: false },
};

const PLAN_COPY: Record<
  string,
  { audience: string; bullets: string[]; popular?: boolean }
> = {
  "sg-14": {
    audience: "Best for clients training nearly every other day",
    bullets: [
      "14 group sessions each month",
      "Member booking priority",
      "Cancel with 30-day notice",
    ],
    popular: true,
  },
  "sg-12": {
    audience: "Best for clients training about 3 times per week",
    bullets: [
      "12 group sessions each month",
      "Member booking priority",
      "Cancel with 30-day notice",
    ],
  },
  "sg-8": {
    audience: "Best for a consistent twice-weekly rhythm",
    bullets: [
      "8 group sessions each month",
      "Flexible month-to-month billing",
      "Cancel with 30-day notice",
    ],
  },
  "sg-4": {
    audience: "Best for getting started or maintaining basics",
    bullets: [
      "4 group sessions each month",
      "Great entry membership",
      "Cancel with 30-day notice",
    ],
  },
  "og-standard": {
    audience: "24/7 key-fob open-gym access",
    bullets: [
      "Open gym membership",
      "Month-to-month billing",
      "30-day cancellation notice",
    ],
  },
};

export default async function BillingPage() {
  const products = await listProducts();
  const membershipsOnly = products.filter(
    (p) => p.productType === "membership" || p.productType === "addon",
  );

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Membership
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase">
          Plans & billing
        </h1>
        <p className="mt-2 text-sm text-muted">
          Choose the training rhythm that fits your goals.
        </p>
      </div>

      <section className="border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
              Current plan
            </p>
            <h2 className="mt-2 font-display text-2xl tracking-wide uppercase">
              {demoClient.membership.name}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {demoClient.membership.sessionsRemaining} of{" "}
              {demoClient.membership.sessionsIncluded} sessions remaining ·
              renews {demoClient.membership.renewsOn}
            </p>
          </div>
          <ManageBillingButton />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl tracking-wide uppercase">
          Available plans
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {membershipsOnly.map((product) => {
            const copy = PLAN_COPY[product.slug];
            return (
              <article
                key={product.id}
                className="relative flex flex-col justify-between gap-4 border border-border bg-surface p-5"
              >
                {copy?.popular ? (
                  <span className="absolute top-0 right-0 bg-brand px-3 py-1 text-[10px] font-semibold tracking-wide text-brand-foreground uppercase">
                    Most popular
                  </span>
                ) : null}
                <div>
                  <h3 className="font-display text-xl tracking-wide uppercase">
                    {product.name}
                  </h3>
                  <p className="mt-2 text-sm text-muted">
                    {copy?.audience ?? product.description}
                  </p>
                  {copy ? (
                    <ul className="mt-4 space-y-1 text-sm text-muted">
                      {copy.bullets.map((b) => (
                        <li key={b}>· {b}</li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="mt-4 text-2xl text-foreground">
                    {formatMoney(product.priceCents)}
                    {product.billingInterval === "month" ? (
                      <span className="text-sm text-muted"> / month</span>
                    ) : null}
                  </p>
                </div>
                <CheckoutButton
                  productSlug={product.slug}
                  productName={product.name}
                  priceCents={product.priceCents}
                  billingInterval={product.billingInterval}
                  label="Choose plan"
                />
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
