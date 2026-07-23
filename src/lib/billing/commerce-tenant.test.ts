import { describe, expect, it } from "vitest";

import { commerceStripeMetadata } from "@/lib/billing/catalog";
import { tenantOnConflict } from "@/lib/tenant/deployment";

const TENANT = "d71ada88-8fad-466f-9264-3a479d54d6e2";

describe("commerce tenant helpers", () => {
  it("commerceStripeMetadata includes tenant_id when deployment configured", () => {
    process.env.MA5_TENANT_ID = TENANT;
    process.env.MA5_LOCATION_ID = "ac85a800-91cc-4ba5-a42c-9b55eac4653a";

    const meta = commerceStripeMetadata({
      user_id: "user-1",
      product_slug: "membership",
    });

    expect(meta.tenant_id).toBe(TENANT);
    expect(meta.user_id).toBe("user-1");
  });

  it("checkout conflict target is tenant-scoped", () => {
    const ctx = {
      tenantId: TENANT,
      locationId: "ac85a800-91cc-4ba5-a42c-9b55eac4653a",
      stripeAccountId: "acct_test",
    };
    expect(tenantOnConflict(ctx, "stripe_checkout_session_id")).toBe(
      "tenant_id,stripe_checkout_session_id",
    );
  });
});
