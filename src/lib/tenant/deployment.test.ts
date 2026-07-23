import { afterEach, describe, expect, it } from "vitest";

import {
  isMa5DeploymentConfigured,
  requireMa5DeploymentContext,
  requireMa5TenantId,
  tenantOnConflict,
  withTenantId,
} from "./deployment";

const TENANT = "d71ada88-8fad-466f-9264-3a479d54d6e2";
const LOCATION = "ac85a800-91cc-4ba5-a42c-9b55eac4653a";

describe("ma5 deployment context", () => {
  const env = process.env;

  afterEach(() => {
    process.env = env;
  });

  function withDeploymentEnv() {
    process.env.MA5_TENANT_ID = TENANT;
    process.env.MA5_LOCATION_ID = LOCATION;
  }

  it("reports unconfigured when env vars missing", () => {
    delete process.env.MA5_TENANT_ID;
    delete process.env.MA5_LOCATION_ID;
    expect(isMa5DeploymentConfigured()).toBe(false);
  });

  it("requires valid tenant id", () => {
    process.env.MA5_TENANT_ID = TENANT;
    expect(requireMa5TenantId()).toBe(TENANT);
  });

  it("throws on invalid uuid", () => {
    process.env.MA5_TENANT_ID = "not-a-uuid";
    expect(() => requireMa5TenantId()).toThrow(/valid UUID/);
  });

  it("builds deployment context with stripe account optional", () => {
    withDeploymentEnv();
    delete process.env.STRIPE_ACCOUNT_ID;

    const ctx = requireMa5DeploymentContext();
    expect(ctx.tenantId).toBe(TENANT);
    expect(ctx.locationId).toBe(LOCATION);
    expect(ctx.stripeAccountId).toBeNull();
  });

  it("withTenantId attaches tenant_id", () => {
    withDeploymentEnv();
    const ctx = requireMa5DeploymentContext();
    expect(withTenantId(ctx, { slug: "test" })).toEqual({
      slug: "test",
      tenant_id: TENANT,
    });
  });

  it("tenantOnConflict prefixes tenant_id", () => {
    withDeploymentEnv();
    const ctx = requireMa5DeploymentContext();
    expect(tenantOnConflict(ctx, "stripe_checkout_session_id")).toBe(
      "tenant_id,stripe_checkout_session_id",
    );
  });
});
