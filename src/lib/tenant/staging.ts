/**
 * Signal Works staging / cutover guards — fail visibly instead of demo fallbacks.
 */

import { isMa5DeploymentConfigured } from "@/lib/tenant/deployment";

/** True when the app targets Signal Works destination (not hobby-only). */
export function isMa5LiveDeployment(): boolean {
  return isMa5DeploymentConfigured();
}

/**
 * Use live DB/storage paths. Demo cookies and fallback fixtures are disabled.
 */
export function shouldUseMa5LiveData(): boolean {
  return isMa5LiveDeployment();
}

export function assertMa5LiveData(
  context: string,
): void {
  if (!shouldUseMa5LiveData()) return;
  throw new Error(
    `${context}: MA5 deployment is configured but required live data is unavailable`,
  );
}
