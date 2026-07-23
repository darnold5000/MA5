import { purgeExpiredAnonymousVisitors } from "@/features/marketing/privacy";
import type { MarketingServiceScope } from "@/features/marketing/service-scope";

export const ATTRIBUTION_PURGE_SAMPLE_RATE = 0.02;
export const ATTRIBUTION_PURGE_RETENTION_DAYS = 90;

export type SampledPurgeOptions = {
  /** Injectable RNG for tests (default Math.random). */
  random?: () => number;
  /** When true, always run purge (tests only). */
  force?: boolean;
};

/**
 * Fire-and-forget sampled cleanup of expired anonymous visitors for one tenant.
 * No-op when scope is null (hobby DB without MA5 tenant deployment).
 */
export function maybeSampledTenantVisitorPurge(
  scope: MarketingServiceScope | null,
  options: SampledPurgeOptions = {},
): void {
  if (!scope) return;

  const random = options.random ?? Math.random;
  if (!options.force && random() >= ATTRIBUTION_PURGE_SAMPLE_RATE) return;

  void purgeExpiredAnonymousVisitors(scope, ATTRIBUTION_PURGE_RETENTION_DAYS);
}

/** Awaitable variant for tests. */
export async function runSampledTenantVisitorPurge(
  scope: MarketingServiceScope | null,
  options: SampledPurgeOptions = {},
): Promise<number> {
  if (!scope) return 0;

  const random = options.random ?? Math.random;
  if (!options.force && random() >= ATTRIBUTION_PURGE_SAMPLE_RATE) return 0;

  return purgeExpiredAnonymousVisitors(scope, ATTRIBUTION_PURGE_RETENTION_DAYS);
}
