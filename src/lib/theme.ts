export type HubTheme = "dark" | "light";

export const HUB_THEME_STORAGE_KEY = "ma5-hub-theme";

export const DEFAULT_HUB_THEME: HubTheme = "dark";

export function isHubTheme(value: string | null | undefined): value is HubTheme {
  return value === "dark" || value === "light";
}

export function readStoredHubTheme(): HubTheme {
  if (typeof window === "undefined") return DEFAULT_HUB_THEME;
  try {
    const stored = window.localStorage.getItem(HUB_THEME_STORAGE_KEY);
    return isHubTheme(stored) ? stored : DEFAULT_HUB_THEME;
  } catch {
    return DEFAULT_HUB_THEME;
  }
}

export function storeHubTheme(theme: HubTheme) {
  try {
    window.localStorage.setItem(HUB_THEME_STORAGE_KEY, theme);
  } catch {
    // ignore quota / private mode
  }
}
