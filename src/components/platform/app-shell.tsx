"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { DemoPreviewChrome } from "@/components/platform/demo-preview";
import { SignOutButton } from "@/components/platform/sign-out-button";
import { HubThemeProvider } from "@/components/platform/theme-context";
import { ThemeToggle } from "@/components/platform/theme-toggle";
import { siteConfig } from "@/content/site-config";
import { cn } from "@/lib/utils";

const SIDEBAR = [
  { href: "/app", label: "Home", match: "exact" as const },
  { href: "/app/schedule", label: "Reserve", match: "prefix" as const },
  { href: "/app/bookings", label: "My Training", match: "prefix" as const },
  { href: "/app/journey", label: "My Journey", match: "prefix" as const },
  { href: "/app/programs", label: "Programs", match: "prefix" as const },
  { href: "/app/profile", label: "Profile", match: "prefix" as const },
  { href: "/app/messages", label: "Messages", match: "messages" as const },
] as const;

const MOBILE = [
  {
    href: "/app",
    label: "Home",
    match: "exact" as const,
    icon: "home",
  },
  {
    href: "/app/schedule",
    label: "Reserve",
    match: "prefix" as const,
    icon: "calendar",
  },
  {
    href: "/app/programs",
    label: "Programs",
    match: "prefix" as const,
    icon: "programs",
  },
  {
    href: "/app/journey",
    label: "My Journey",
    match: "prefix" as const,
    icon: "journey",
  },
  {
    href: "/app/profile",
    label: "Profile",
    match: "prefix" as const,
    icon: "profile",
  },
  {
    href: "/app/messages",
    label: "Messages",
    match: "messages" as const,
    icon: "messages",
  },
] as const;

function isActive(
  pathname: string,
  href: string,
  match: "exact" | "prefix" | "messages",
) {
  if (match === "exact") return pathname === href;
  if (match === "messages") {
    return (
      pathname.startsWith("/app/messages") ||
      pathname.startsWith("/app/announcements") ||
      pathname.startsWith("/app/inbox")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavIcon({
  name,
  className,
}: {
  name: (typeof MOBILE)[number]["icon"];
  className?: string;
}) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: cn("h-6 w-6", className),
    "aria-hidden": true as const,
  };

  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 10v10h14V10" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="1" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      );
    case "programs":
      return (
        <svg {...common}>
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      );
    case "journey":
      return (
        <svg {...common}>
          <path d="M4 20V10" />
          <path d="M10 20V4" />
          <path d="M16 20v-8" />
          <path d="M22 20V8" />
        </svg>
      );
    case "profile":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      );
    case "messages":
      return (
        <svg {...common}>
          <path d="M4 6h16v10H8l-4 3V6z" />
        </svg>
      );
  }
}

export type AppShellProps = {
  children: React.ReactNode;
  memberName: string;
  memberPlan: string;
  inboxUnread?: number;
};

export function AppShell({
  children,
  memberName,
  memberPlan,
  inboxUnread = 0,
}: AppShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <HubThemeProvider scope="app">
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-6 sm:py-3 lg:px-8">
          <Link
            href="/app"
            className="flex min-w-0 items-center gap-2.5 text-foreground touch-manipulation"
          >
            <Image
              src="/images/brand/ma5-logo.jpeg"
              alt=""
              width={40}
              height={40}
              className="h-9 w-9 shrink-0 rounded-full object-cover sm:h-10 sm:w-10"
            />
            <span className="truncate font-display text-lg tracking-[0.08em] uppercase sm:text-2xl">
              {siteConfig.shortName}
              <span className="text-brand"> Performance</span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/app/messages"
              className="relative inline-flex size-11 items-center justify-center border border-border text-muted transition touch-manipulation hover:border-brand hover:text-foreground"
              aria-label={
                inboxUnread > 0
                  ? `Messages, ${inboxUnread} unread`
                  : "Messages"
              }
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" />
                <path d="M10 20a2 2 0 0 0 4 0" />
              </svg>
              {inboxUnread > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center bg-brand px-1 text-[10px] font-semibold text-brand-foreground">
                  {inboxUnread > 9 ? "9+" : inboxUnread}
                </span>
              ) : null}
            </Link>

            <button
              type="button"
              className="inline-flex size-11 items-center justify-center border border-border text-foreground touch-manipulation lg:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="app-mobile-menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? (
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                >
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              ) : (
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                >
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              )}
            </button>
            <ThemeToggle />
          </div>
        </div>

        {menuOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              aria-label="Dismiss menu"
              onClick={() => setMenuOpen(false)}
            />
            <div
              id="app-mobile-menu"
              className="absolute inset-x-0 top-full z-50 border-b border-border bg-surface shadow-lg lg:hidden"
            >
              <div className="border-b border-border px-4 py-4">
                <p className="text-sm font-medium text-foreground">
                  {memberName}
                </p>
                <p className="mt-0.5 text-xs tracking-wide text-muted">
                  {memberPlan}
                </p>
              </div>
              <nav aria-label="More" className="flex flex-col p-2">
                {(
                  [
                    { href: "/app/bookings", label: "My Training" },
                    { href: "/app/announcements", label: "Announcements" },
                  ] as const
                ).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex min-h-12 items-center px-3 text-sm tracking-wide text-foreground touch-manipulation active:bg-brand/10"
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                <SignOutButton
                  showIcon
                  className="flex min-h-12 w-full items-center gap-2 px-3 text-left text-sm tracking-wide text-muted touch-manipulation"
                />
              </nav>
            </div>
          </>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-56 shrink-0 flex-col border-r border-border bg-surface lg:flex">
          <div className="border-b border-border px-4 py-5">
            <Link
              href="/app/profile"
              className="block transition hover:opacity-90"
            >
              <p className="text-sm font-medium text-foreground">{memberName}</p>
              <p className="mt-1 text-xs tracking-wide text-muted">
                {memberPlan}
              </p>
            </Link>
          </div>
          <nav aria-label="App" className="flex flex-1 flex-col gap-1 p-3">
            {SIDEBAR.map((item) => {
              const active = isActive(pathname, item.href, item.match);
              const showBadge =
                item.href === "/app/messages" && inboxUnread > 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between gap-2 px-3 py-2.5 text-sm tracking-wide transition",
                    active
                      ? "border-l-2 border-brand bg-brand/10 text-foreground"
                      : "border-l-2 border-transparent text-muted hover:text-foreground",
                  )}
                >
                  <span>{item.label}</span>
                  {showBadge ? (
                    <span className="flex h-5 min-w-5 items-center justify-center bg-brand px-1 text-[10px] font-semibold text-brand-foreground">
                      {inboxUnread > 9 ? "9+" : inboxUnread}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto border-t border-border p-4">
            <SignOutButton
              showIcon
              className="flex w-full items-center gap-2 px-3 py-2 text-sm tracking-wide text-muted transition hover:text-foreground"
            />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
          <main
            id="main-content"
            className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8"
          >
            {children}
          </main>
        </div>
      </div>

      <nav
        aria-label="App mobile"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-6">
          {MOBILE.map((item) => {
            const active = isActive(pathname, item.href, item.match);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={cn(
                  "relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold tracking-wide uppercase touch-manipulation active:bg-brand/10",
                  active ? "text-brand" : "text-muted",
                )}
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
                {item.href === "/app/messages" && inboxUnread > 0 ? (
                  <span className="absolute top-2 right-[18%] size-2 rounded-full bg-brand" />
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>

      <DemoPreviewChrome />
    </div>
    </HubThemeProvider>
  );
}
