import { describe, expect, it } from "vitest";

import {
  subscriptionPeriodEnd,
  subscriptionPeriodStart,
} from "@/lib/billing/stripe-subscription-periods";

describe("stripe subscription periods", () => {
  it("reads period end from subscription items when top-level is missing", () => {
    const sub = {
      items: {
        data: [{ current_period_end: 1_900_000_000 }],
      },
    };
    expect(subscriptionPeriodEnd(sub as never)).toBe(
      new Date(1_900_000_000 * 1000).toISOString(),
    );
  });

  it("prefers top-level period start when present", () => {
    const sub = {
      current_period_start: 1_800_000_000,
      items: { data: [{ current_period_start: 1_700_000_000 }] },
    };
    expect(subscriptionPeriodStart(sub as never)).toBe(
      new Date(1_800_000_000 * 1000).toISOString(),
    );
  });
});
