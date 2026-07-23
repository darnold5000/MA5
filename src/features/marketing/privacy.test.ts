import { describe, expect, it } from "vitest";

import {
  deleteAnonymousVisitor,
  deleteUnconvertedLead,
  purgeExpiredAnonymousVisitors,
  updateLeadStatus,
} from "@/features/marketing/privacy";
import type { MarketingServiceScope } from "@/features/marketing/service-scope";
import { createTenantScopedAdmin } from "@/test/helpers/tenant-scoped-admin";

const TENANT_A = "d71ada88-8fad-466f-9264-3a479d54d6e2";
const TENANT_B = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

const LEAD_B = "11111111-2222-4333-8444-555555555555";
const VISITOR_B = "22222222-3333-4333-8444-666666666666";

function scopeForTenantA(admin: MarketingServiceScope["admin"]): MarketingServiceScope {
  return { admin, tenantId: TENANT_A };
}

describe("marketing service-role tenant isolation", () => {
  it("updateLeadStatus applies tenant_id and cannot mutate tenant B lead", async () => {
    const { admin } = createTenantScopedAdmin({
      leads: [
        {
          id: LEAD_B,
          tenant_id: TENANT_B,
          status: "new",
        },
      ],
    });

    const result = await updateLeadStatus(
      scopeForTenantA(admin),
      LEAD_B,
      "contacted",
    );

    expect(result).toEqual({ ok: false, error: "Lead not found" });
  });

  it("updateLeadStatus updates only when lead belongs to configured tenant", async () => {
    const tables = {
      leads: [
        {
          id: LEAD_B,
          tenant_id: TENANT_A,
          status: "new",
        },
      ],
    };
    const { admin } = createTenantScopedAdmin(tables);

    const result = await updateLeadStatus(
      scopeForTenantA(admin),
      LEAD_B,
      "contacted",
    );

    expect(result).toEqual({ ok: true });
  });

  it("deleteAnonymousVisitor cannot delete tenant B visitor session", async () => {
    const tables = {
      visitorSessions: [
        {
          visitor_id: VISITOR_B,
          tenant_id: TENANT_B,
        },
      ],
      leads: [],
    };
    const { admin } = createTenantScopedAdmin(tables);

    const result = await deleteAnonymousVisitor(
      scopeForTenantA(admin),
      VISITOR_B,
    );

    expect(result).toEqual({ ok: false, error: "Visitor session not found" });
    expect(tables.visitorSessions).toHaveLength(1);
  });

  it("deleteUnconvertedLead cannot delete tenant B lead", async () => {
    const tables = {
      leads: [
        {
          id: LEAD_B,
          tenant_id: TENANT_B,
          status: "new",
          converted_profile_id: null,
        },
      ],
    };
    const { admin } = createTenantScopedAdmin(tables);

    const result = await deleteUnconvertedLead(scopeForTenantA(admin), LEAD_B);

    expect(result).toEqual({ ok: false, error: "Lead not found" });
    expect(tables.leads).toHaveLength(1);
  });

  it("purgeExpiredAnonymousVisitors only removes sessions for configured tenant", async () => {
    const old = new Date();
    old.setDate(old.getDate() - 100);

    const tables = {
      visitorSessions: [
        {
          visitor_id: "aaaa-tenant-a",
          tenant_id: TENANT_A,
          last_seen: old.toISOString(),
        },
        {
          visitor_id: "bbbb-tenant-b",
          tenant_id: TENANT_B,
          last_seen: old.toISOString(),
        },
      ],
      leads: [],
    };
    const { admin } = createTenantScopedAdmin(tables);

    const deleted = await purgeExpiredAnonymousVisitors(scopeForTenantA(admin), 90);

    expect(deleted).toBe(1);
    expect(tables.visitorSessions).toHaveLength(1);
    expect(tables.visitorSessions![0]!.tenant_id).toBe(TENANT_B);
  });
});
