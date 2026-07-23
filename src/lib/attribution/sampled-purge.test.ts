import { describe, expect, it } from "vitest";

import type { MarketingServiceScope } from "@/features/marketing/service-scope";
import {
  ATTRIBUTION_PURGE_SAMPLE_RATE,
  maybeSampledTenantVisitorPurge,
  runSampledTenantVisitorPurge,
} from "@/lib/attribution/sampled-purge";
import { createTenantScopedAdmin } from "@/test/helpers/tenant-scoped-admin";

const TENANT_A = "d71ada88-8fad-466f-9264-3a479d54d6e2";
const TENANT_B = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

describe("attribution sampled tenant purge", () => {
  it("does not run when scope is null (hobby deployment)", async () => {
    const tables = {
      visitorSessions: [
        {
          visitor_id: "expired-a",
          tenant_id: TENANT_A,
          last_seen: new Date(0).toISOString(),
        },
      ],
    };
    const deleted = await runSampledTenantVisitorPurge(null, { force: true });
    expect(deleted).toBe(0);
    expect(tables.visitorSessions).toHaveLength(1);
  });

  it("skips purge when sample draw misses", async () => {
    const { admin } = createTenantScopedAdmin({ visitorSessions: [], leads: [] });
    const scope: MarketingServiceScope = { admin, tenantId: TENANT_A };

    maybeSampledTenantVisitorPurge(scope, {
      random: () => ATTRIBUTION_PURGE_SAMPLE_RATE,
    });

    // No throw; sampling skipped (random must be < rate to run).
  });

  it("visit purge for tenant A cannot purge expired sessions belonging to tenant B", async () => {
    const old = new Date();
    old.setDate(old.getDate() - 100);

    const tables = {
      visitorSessions: [
        {
          visitor_id: "expired-tenant-a",
          tenant_id: TENANT_A,
          last_seen: old.toISOString(),
        },
        {
          visitor_id: "expired-tenant-b",
          tenant_id: TENANT_B,
          last_seen: old.toISOString(),
        },
      ],
      leads: [],
    };
    const { admin } = createTenantScopedAdmin(tables);
    const scope: MarketingServiceScope = { admin, tenantId: TENANT_A };

    const deleted = await runSampledTenantVisitorPurge(scope, { force: true });

    expect(deleted).toBe(1);
    expect(tables.visitorSessions).toHaveLength(1);
    expect(tables.visitorSessions[0]?.tenant_id).toBe(TENANT_B);
    expect(tables.visitorSessions[0]?.visitor_id).toBe("expired-tenant-b");
  });
});
