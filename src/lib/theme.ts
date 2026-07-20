export type HubTheme = "dark" | "light";

export type HubThemeScope = "app" | "admin";

export const HUB_THEME_STORAGE_KEYS: Record<HubThemeScope, string> = {
  app: "ma5-app-theme",
  admin: "ma5-admin-theme",
};

/** @deprecated Shared key from earlier builds — read once when migrating */
const LEGACY_HUB_THEME_STORAGE_KEY = "ma5-hub-theme";

export const DEFAULT_HUB_THEME: HubTheme = "dark";

export function isHubTheme(value: string | null | undefined): value is HubTheme {
  return value === "dark" || value === "light";
}

export function readStoredHubTheme(scope: HubThemeScope): HubTheme {
  if (typeof window === "undefined") return DEFAULT_HUB_THEME;
  try {
    const key = HUB_THEME_STORAGE_KEYS[scope];
    const stored = window.localStorage.getItem(key);
    if (isHubTheme(stored)) return stored;

    const legacy = window.localStorage.getItem(LEGACY_HUB_THEME_STORAGE_KEY);
    if (isHubTheme(legacy)) {
      window.localStorage.setItem(key, legacy);
      return legacy;
    }

    return DEFAULT_HUB_THEME;
  } catch {
    return DEFAULT_HUB_THEME;
  }
}

export function storeHubTheme(scope: HubThemeScope, theme: HubTheme) {
  try {
    window.localStorage.setItem(HUB_THEME_STORAGE_KEYS[scope], theme);
  } catch {
    // ignore quota / private mode
  }
}
