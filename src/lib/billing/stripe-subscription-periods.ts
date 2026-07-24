import type Stripe from "stripe";

type PeriodFields = {
  current_period_start?: number;
  current_period_end?: number;
};

function readPeriodFromItem(item: unknown): PeriodFields | null {
  if (!item || typeof item !== "object") return null;
  const row = item as PeriodFields;
  if (row.current_period_end != null || row.current_period_start != null) {
    return row;
  }
  return null;
}

/** Stripe API versions may expose period on the subscription or on line items. */
export function subscriptionPeriodEnd(sub: Stripe.Subscription): string | null {
  const top = (sub as Stripe.Subscription & PeriodFields).current_period_end;
  if (top) return new Date(top * 1000).toISOString();

  for (const item of sub.items?.data ?? []) {
    const fromItem = readPeriodFromItem(item);
    if (fromItem?.current_period_end) {
      return new Date(fromItem.current_period_end * 1000).toISOString();
    }
  }
  return null;
}

export function subscriptionPeriodStart(sub: Stripe.Subscription): string | null {
  const top = (sub as Stripe.Subscription & PeriodFields).current_period_start;
  if (top) return new Date(top * 1000).toISOString();

  for (const item of sub.items?.data ?? []) {
    const fromItem = readPeriodFromItem(item);
    if (fromItem?.current_period_start) {
      return new Date(fromItem.current_period_start * 1000).toISOString();
    }
  }
  return null;
}
