/** Preset groups for the public pricing page and admin catalog. */
export const OFFERING_CATEGORY_PRESETS = [
  { value: "small_group", label: "Small group" },
  { value: "semi_private", label: "Semi-private" },
  { value: "sports_performance", label: "Sports performance" },
  { value: "open_gym", label: "Open gym" },
  { value: "assessment", label: "Assessment" },
  { value: "recovery", label: "Recovery" },
  { value: "inbody", label: "InBody" },
  { value: "sauna", label: "Sauna" },
] as const;

export const CUSTOM_OFFERING_CATEGORY = "__custom__";

export function isPresetOfferingCategory(
  value: string | null | undefined,
): value is (typeof OFFERING_CATEGORY_PRESETS)[number]["value"] {
  if (!value) return false;
  return OFFERING_CATEGORY_PRESETS.some((preset) => preset.value === value);
}

export function formatOfferingCategory(category: string): string {
  const preset = OFFERING_CATEGORY_PRESETS.find((p) => p.value === category);
  if (preset) return preset.label;
  return category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Store-friendly key from a custom label (e.g. "Youth Training" → youth_training). */
export function normalizeOfferingCategory(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}
