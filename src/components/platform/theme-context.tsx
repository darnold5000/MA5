"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  DEFAULT_HUB_THEME,
  readStoredHubTheme,
  storeHubTheme,
  type HubTheme,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

type ThemeContextValue = {
  theme: HubTheme;
  setTheme: (theme: HubTheme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function HubThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<HubTheme>(DEFAULT_HUB_THEME);

  useEffect(() => {
    setThemeState(readStoredHubTheme());
  }, []);

  const setTheme = useCallback((next: HubTheme) => {
    setThemeState(next);
    storeHubTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next = current === "dark" ? "light" : "dark";
      storeHubTheme(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <HubThemeShell theme={theme}>{children}</HubThemeShell>
    </ThemeContext.Provider>
  );
}

function HubThemeShell({
  theme,
  children,
}: {
  theme: HubTheme;
  children: React.ReactNode;
}) {
  return (
    <div
      data-hub-theme={theme}
      className={cn(
        "hub-theme flex min-h-full min-w-0 flex-1 flex-col bg-background text-foreground",
      )}
    >
      {children}
    </div>
  );
}

export function useHubTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useHubTheme must be used within HubThemeProvider");
  }
  return ctx;
}
