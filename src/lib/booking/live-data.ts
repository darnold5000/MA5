import { isMa5DeploymentConfigured } from "@/lib/tenant/deployment";

/** When true, demo booking cookies must not be merged into client UI. */
export function useLiveBookingsOnly(): boolean {
  return isMa5DeploymentConfigured();
}
