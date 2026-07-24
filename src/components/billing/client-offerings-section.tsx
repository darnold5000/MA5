import { CheckoutButton } from "@/components/billing/checkout-button";
import { formatMoney } from "@/features/scheduling/format";
import { listActiveOfferings } from "@/lib/billing/catalog";
import { getActivePurchasedProductIds } from "@/lib/billing/membership-summary";

export async function ClientOfferingsSection({
  userId,
}: {
  userId?: string | null;
}) {
  const offerings = await listActiveOfferings();
  const ownedIds = userId ? await getActivePurchasedProductIds(userId) : new Set();
  const purchasable = offerings.filter(
    (o) => o.currentStripePriceId && !ownedIds.has(o.id),
  );

  if (offerings.length === 0) {
    return (
      <p className="text-sm text-muted">
        No plans are available for purchase yet. Contact MA5 if you expected to
        see a membership or package here.
      </p>
    );
  }

  if (purchasable.length === 0) {
    return (
      <p className="text-sm text-muted">
        {ownedIds.size > 0
          ? "You’re on an active plan. Contact MA5 if you want to change or add another offering."
          : "Offerings are being set up. Check back soon or contact MA5 for help completing your purchase."}
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {purchasable.map((o) => (
        <li
          key={o.id}
          className="flex flex-col gap-3 border border-border bg-background/40 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="font-medium text-foreground">{o.name}</p>
            {o.description ? (
              <p className="mt-1 text-sm text-muted">{o.description}</p>
            ) : null}
            <p className="mt-2 text-sm text-foreground">
              {formatMoney(o.priceCents)}
              {o.billingInterval === "month" ? " / month" : ""}
            </p>
          </div>
          <div className="w-full shrink-0 sm:w-44">
            <CheckoutButton
              productSlug={o.slug}
              productName={o.name}
              priceCents={o.priceCents}
              billingInterval={o.billingInterval}
              label="Purchase"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
