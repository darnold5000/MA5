import type { Ma5DeploymentContext } from "@/lib/tenant/deployment";

type TenantScopedQuery<T> = {
  eq: (column: string, value: string) => T;
};

/** Apply tenant_id filter when deployment context is present. */
export function scopeToTenant<T extends TenantScopedQuery<T>>(
  query: T,
  ctx: Ma5DeploymentContext | null,
): T {
  return ctx ? query.eq("tenant_id", ctx.tenantId) : query;
}
