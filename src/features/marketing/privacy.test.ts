import { describe, expect, it } from "vitest";

import {
  deleteAnonymousVisitor,
  deleteUnconvertedLead,
  purgeExpiredAnonymousVisitors,
  updateLeadStatus,
} from "@/features/marketing/privacy";
import type { MarketingServiceScope } from "@/features/marketing/service-scope";
import { MA5_TABLES } from "@/lib/supabase/tables";

const TENANT_A = "d71ada88-8fad-466f-9264-3a479d54d6e2";
const TENANT_B = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

const LEAD_B = "11111111-2222-4333-8444-555555555555";
const VISITOR_B = "22222222-3333-4333-8444-666666666666";

type Row = Record<string, unknown>;

type TableData = {
  leads?: Row[];
  visitorSessions?: Row[];
  profiles?: Row[];
};

type Filter = { column: string; value: string };

function createTenantScopedAdmin(tables: TableData) {
  const eqFilters: Filter[] = [];
  let activeTable = "";
  let operation: "select" | "update" | "delete" = "select";

  function rowsForTable(table: string): Row[] {
    if (table === MA5_TABLES.leads) return tables.leads ?? [];
    if (table === MA5_TABLES.visitorSessions) return tables.visitorSessions ?? [];
    if (table === MA5_TABLES.profiles) return tables.profiles ?? [];
    return [];
  }

  function matches(row: Row, filters: Filter[]): boolean {
    return filters.every((f) => String(row[f.column] ?? row[camel(f.column)]) === f.value);
  }

  function camel(col: string): string {
    if (col === "visitor_id") return "visitor_id";
    return col;
  }

  const chain = {
    from(table: string) {
      activeTable = table;
      eqFilters.length = 0;
      return chain;
    },
    select() {
      if (operation !== "delete") {
        operation = "select";
      }
      return chain;
    },
    update() {
      operation = "update";
      return chain;
    },
    delete() {
      operation = "delete";
      return chain;
    },
    eq(column: string, value: string) {
      eqFilters.push({ column, value });
      return chain;
    },
    in(column: string, values: string[]) {
      eqFilters.push({ column, value: `__in__:${values.join(",")}` });
      return chain;
    },
    lt(column: string, value: string) {
      eqFilters.push({ column, value: `__lt__:${value}` });
      return chain;
    },
    limit() {
      return chain;
    },
    maybeSingle() {
      const tenantFilter = eqFilters.find((f) => f.column === "tenant_id");
      const plainFilters = eqFilters.filter(
        (f) => f.column !== "tenant_id" && !f.value.startsWith("__"),
      );
      const rows = rowsForTable(activeTable).filter((row) => {
        if (tenantFilter && String(row.tenant_id) !== tenantFilter.value) {
          return false;
        }
        for (const f of plainFilters) {
          if (String(row[f.column]) !== f.value) return false;
        }
        return true;
      });
      return Promise.resolve({ data: rows[0] ?? null, error: null });
    },
    then(
      resolve: (value: { data: Row[] | Row | null; error: null }) => void,
    ) {
      const tenantFilter = eqFilters.find((f) => f.column === "tenant_id");
      const plainFilters = eqFilters.filter(
        (f) => f.column !== "tenant_id" && !f.value.startsWith("__"),
      );

      let rows = rowsForTable(activeTable).filter((row) => {
        if (tenantFilter && String(row.tenant_id) !== tenantFilter.value) {
          return false;
        }
        for (const f of plainFilters) {
          if (String(row[f.column]) !== f.value) return false;
        }
        const ltFilter = eqFilters.find((f) => f.value.startsWith("__lt__:"));
        if (ltFilter) {
          const cutoff = ltFilter.value.replace("__lt__:", "");
          const rowVal = String(row[ltFilter.column] ?? "");
          if (!(rowVal < cutoff)) return false;
        }
        return true;
      });

      const inFilter = eqFilters.find((f) => f.value.startsWith("__in__:"));
      if (inFilter) {
        const allowed = new Set(inFilter.value.replace("__in__:", "").split(","));
        rows = rows.filter((row) =>
          allowed.has(String(row[inFilter.column])),
        );
      }

      if (operation === "delete") {
        const deleted = rows.map((r) => ({ ...r }));
        for (const row of rows) {
          const tableRows = rowsForTable(activeTable);
          const idx = tableRows.indexOf(row);
          if (idx >= 0) tableRows.splice(idx, 1);
        }
        const data =
          deleted.length === 1 && !inFilter
            ? deleted[0]
            : deleted.length > 0
              ? deleted
              : null;
        resolve({ data: data as Row[] | Row | null, error: null });
        return;
      }

      resolve({ data: rows, error: null });
    },
  };

  return {
    admin: { from: chain.from } as unknown as MarketingServiceScope["admin"],
    getEqFilters: () => [...eqFilters],
  };
}

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
    const tables: TableData = {
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
    const tables: TableData = {
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
    const tables: TableData = {
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

    const tables: TableData = {
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
