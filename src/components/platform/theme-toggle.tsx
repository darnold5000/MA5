"use client";

import { useHubTheme } from "@/components/platform/theme-context";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
};

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5z" />
    </svg>
  );
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useHubTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Dark mode" : "Light mode";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 border border-border px-3 text-foreground transition hover:border-brand sm:px-4",
        className,
      )}
      aria-label={`${label}. Switch to ${isDark ? "light" : "dark"} mode.`}
      title={label}
    >
      {isDark ? (
        <MoonIcon className="h-5 w-5 shrink-0" />
      ) : (
        <SunIcon className="h-5 w-5 shrink-0" />
      )}
      <span className="text-xs font-semibold tracking-wide whitespace-nowrap uppercase">
        {label}
      </span>
    </button>
  );
}
