/**
 * Production vs local demo data guards.
 *
 * Demo cookies and fixture fallbacks are allowed only when MA5_DEMO_MODE=true
 * and Signal Works deployment IDs are not configured.
 */

import { isMa5DeploymentConfigured } from "@/lib/tenant/deployment";

/** Explicit local demo — never inferred from missing configuration. */
export function isMa5DemoModeEnabled(): boolean {
  return process.env.MA5_DEMO_MODE?.trim().toLowerCase() === "true";
}

/** App targets Signal Works tenant + location (production/staging runtime). */
export function isMa5ProductionRuntime(): boolean {
  return isMa5DeploymentConfigured();
}

/**
 * Cookie-backed bookings, seeded fixtures, and demo personas may be used.
 * Disabled whenever MA5_TENANT_ID + MA5_LOCATION_ID are set.
 */
export function allowDemoFallbacks(): boolean {
  if (isMa5DeploymentConfigured()) return false;
  return isMa5DemoModeEnabled();
}

/** @deprecated Prefer allowDemoFallbacks() — inverted semantics. */
export function shouldUseMa5LiveData(): boolean {
  return isMa5ProductionRuntime();
}

/** When true, demo booking cookies must not be merged into client UI. */
export function useLiveBookingsOnly(): boolean {
  return !allowDemoFallbacks();
}

export function assertMa5LiveData(context: string): void {
  if (!shouldUseMa5LiveData()) return;
  throw new Error(
    `${context}: MA5 deployment is configured but required live data is unavailable`,
  );
}
