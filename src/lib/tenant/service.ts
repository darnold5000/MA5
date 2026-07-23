/**
 * Server-only: service-role Supabase client paired with deployment tenant context.
 */

import { createServiceClient } from "@/lib/supabase/server";

import {
  requireMa5DeploymentContext,
  type Ma5DeploymentContext,
} from "./deployment";

export type Ma5TenantServiceClient = {
  supabase: ReturnType<typeof createServiceClient>;
  ctx: Ma5DeploymentContext;
};

/**
 * Preferred entry for service-role DB work on Signal Works.
 * Ensures tenant context is resolved before any query runs.
 */
export function createMa5TenantServiceClient(): Ma5TenantServiceClient {
  return {
    supabase: createServiceClient(),
    ctx: requireMa5DeploymentContext(),
  };
}
