import { afterEach, describe, expect, it } from "vitest";

import { tenantOnConflict } from "@/lib/tenant/deployment";

import { inviteUserMetadata } from "./tenant-data";

const TENANT = "d71ada88-8fad-466f-9264-3a479d54d6e2";
const LOCATION = "ac85a800-91cc-4ba5-a42c-9b55eac4653a";

describe("tenant-data helpers", () => {
  const env = process.env;

  afterEach(() => {
    process.env = env;
  });

  it("inviteUserMetadata includes deployment tenant", () => {
    process.env.MA5_TENANT_ID = TENANT;
    process.env.MA5_LOCATION_ID = LOCATION;

    const meta = inviteUserMetadata(
      {
        tenantId: TENANT,
        locationId: LOCATION,
        stripeAccountId: null,
      },
      { fullName: "Alex", role: "client", inviteGeneration: 1 },
    );

    expect(meta.ma5_tenant_id).toBe(TENANT);
    expect(meta.full_name).toBe("Alex");
  });

  it("role upsert conflict target is tenant-scoped", () => {
    const ctx = {
      tenantId: TENANT,
      locationId: LOCATION,
      stripeAccountId: null,
    };
    expect(tenantOnConflict(ctx, "user_id,role")).toBe(
      "tenant_id,user_id,role",
    );
  });
});
