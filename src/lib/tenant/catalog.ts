/**
 * Tenant scope for service-role catalog reads/writes.
 */

import {
  createClient,
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { isMa5DeploymentConfigured } from "@/lib/tenant/deployment";
import { createMa5TenantServiceClient } from "@/lib/tenant/service";

export type CatalogDb = {
  supabase: ReturnType<typeof createServiceClient>;
  tenantId: string | null;
};

export async function resolveCatalogDb(options?: {
  useServiceRole?: boolean;
}): Promise<CatalogDb> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }

  if (options?.useServiceRole) {
    if (isMa5DeploymentConfigured()) {
      const client = createMa5TenantServiceClient();
      return { supabase: client.supabase, tenantId: client.ctx.tenantId };
    }
    return { supabase: createServiceClient(), tenantId: null };
  }

  return { supabase: await createClient(), tenantId: null };
}

export function applyTenantFilter<Q>(
  query: Q,
  tenantId: string | null,
): Q {
  if (tenantId) {
    return (query as { eq: (col: string, val: string) => Q }).eq(
      "tenant_id",
      tenantId,
    );
  }
  return query;
}
