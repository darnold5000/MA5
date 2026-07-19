import type { OfferingStatus } from "./types";

/** Customer-facing lifecycle labels for business owners. */
export function offeringStatusLabel(status: OfferingStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "inactive":
      return "Hidden";
    case "archived":
      return "Archived";
    case "draft":
      return "Draft";
    default:
      return status;
  }
}

export type OfferingLifecycleAction = "hide" | "show" | "archive" | "restore";

export type OfferingLifecycleConfirmAction = Exclude<
  OfferingLifecycleAction,
  "show"
>;

export const OFFERING_LIFECYCLE_CONFIRM: Record<
  OfferingLifecycleConfirmAction,
  string
> = {
  hide: "This offering will no longer appear to customers. Existing subscriptions are unaffected. You can show it again at any time.",
  archive:
    "This offering will be retired and removed from active management. Existing subscriptions and payment history will be preserved. You can restore it later if needed.",
  restore:
    "This offering will return to the admin offering list. Review its price and settings before making it visible to customers.",
};

export function lifecycleActionToStatus(
  action: OfferingLifecycleAction,
): OfferingStatus {
  switch (action) {
    case "hide":
      return "inactive";
    case "show":
      return "active";
    case "archive":
      return "archived";
    case "restore":
      return "inactive";
  }
}
