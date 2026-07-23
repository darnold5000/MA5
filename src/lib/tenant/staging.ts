/**
 * Signal Works staging / cutover guards — fail visibly instead of demo fallbacks.
 */

export {
  allowDemoFallbacks,
  assertMa5LiveData,
  isMa5DemoModeEnabled,
  isMa5ProductionRuntime,
  shouldUseMa5LiveData,
  useLiveBookingsOnly,
} from "@/lib/tenant/runtime-data";

/** @deprecated Use isMa5ProductionRuntime() */
export { isMa5ProductionRuntime as isMa5LiveDeployment } from "@/lib/tenant/runtime-data";
