import type { createServiceClient } from "@/lib/supabase/server";

/** Service-role client + explicit tenant scope (never rely on RLS). */
export type MarketingServiceScope = {
  admin: ReturnType<typeof createServiceClient>;
  tenantId: string;
};
