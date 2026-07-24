"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Demo mode — kept but hidden
// import { ClientHubPreview } from "@/components/admin/client-hub-preview";
// import { DemoPreviewChrome } from "@/components/platform/demo-preview";
import { SignOutButton } from "@/components/platform/sign-out-button";
import { HubThemeProvider } from "@/components/platform/theme-context";
import { ThemeToggle } from "@/components/platform/theme-toggle";
import { siteConfig } from "@/content/site-config";
import { cn } from "@/lib/utils";

const SIDEBAR = [
  { href: "/admin", label: "Home", match: "exact" as const },
  { href: "/admin/schedule", label: "Schedule", match: "prefix" as const },
  { href: "/admin/clients", label: "Clients", match: "prefix" as const },
  {
    href: "/admin/programs",
    label: "Library",
    match: "programs" as const,
  },
  { href: "/admin/reports", label: "Reports", match: "prefix" as const },
  {
    href: "/admin/offerings",
    label: "Offerings",
    match: "prefix" as const,
  },
  {
    href: "/admin/marketing",
    label: "Growth",
    match: "marketing" as const,
  },
  {
    href: "/admin/messages",
    label: "Messages",
    match: "communication" as const,
  },
  {
    href: "/admin/community",
    label: "Community",
    match: "prefix" as const,
  },
] as const;

/** Primary destinations in the mobile bottom bar (icons only). */
const MOBILE_TAB = [
  { href: "/admin", label: "Home", match: "exact" as const, icon: "home" },
  {
    href: "/admin/schedule",
    label: "Schedule",
    match: "prefix" as const,
    icon: "calendar",
  },
  {
    href: "/admin/clients",
    label: "Clients",
    match: "prefix" as const,
    icon: "clients",
  },
  {
    href: "/admin/messages",
    label: "Messages",
    match: "communication" as const,
    icon: "messages",
  },
] as const;

function isActive(
  pathname: string,
  href: string,
  match: "exact" | "prefix" | "programs" | "communication" | "marketing",
) {
  if (match === "exact") return pathname === href;
  if (match === "programs") {
    return (
      pathname === "/admin/programs" || pathname.startsWith("/admin/programs/")
    );
  }
  if (match === "communication") {
    return (
      pathname.startsWith("/admin/messages") ||
      pathname.startsWith("/admin/announcements") ||
      pathname.startsWith("/admin/inbox")
    );
  }
  if (match === "marketing") {
    return pathname.startsWith("/admin/marketing");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavIcon({
  name,
  className,
}: {
  name: (typeof MOBILE_TAB)[number]["icon"] | "menu" | "close";
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
    case "clients":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <circle cx="16" cy="9" r="2.5" />
          <path d="M3 19a6 6 0 0 1 12 0" />
          <path d="M14 19a5 5 0 0 1 7 0" />
        </svg>
      );
    case "messages":
      return (
        <svg {...common}>
          <path d="M4 6h16v10H8l-4 3V6z" />
        </svg>
      );
    case "menu":
      return (
        <svg {...common}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      );
  }
}

export function AdminShell({
  children,
  communicationUnread = 0,
}: {
  children: React.ReactNode;
  communicationUnread?: number;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  // Demo mode kept but hidden — restore by uncommenting demoOpen / triggers below.
  // const [demoOpen, setDemoOpen] = useState(false);

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
    <HubThemeProvider scope="admin">
      <div className="flex min-h-full flex-1 bg-background">
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-border bg-surface lg:flex">
          <div className="border-b border-border px-4 py-5">
            <Link href="/admin" className="flex items-center gap-3">
              <Image
                src="/images/brand/ma5-logo.jpeg"
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 rounded-full object-cover"
              />
              <div>
                <span className="block font-display text-lg tracking-[0.08em] uppercase">
                  {siteConfig.shortName}
                </span>
              </div>
            </Link>
          </div>
          <nav aria-label="Admin" className="flex flex-1 flex-col gap-1 p-3">
            {SIDEBAR.map((item) => {
              const active = isActive(pathname, item.href, item.match);
              const showBadge =
                item.match === "communication" && communicationUnread > 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between gap-2 px-3 py-2.5 text-sm tracking-wide transition",
                    active
                      ? "border-l-2 border-brand bg-brand/10 font-semibold text-foreground"
                      : "border-l-2 border-transparent text-muted hover:text-foreground",
                  )}
                >
                  <span>{item.label}</span>
                  {showBadge ? (
                    <span className="flex h-5 min-w-5 items-center justify-center bg-brand px-1 text-[10px] font-semibold text-brand-foreground">
                      {communicationUnread > 9 ? "9+" : communicationUnread}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto space-y-1 border-t border-border p-4">
            {/* Demo mode — kept but hidden
            <button
              type="button"
              onClick={() => setDemoOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={demoOpen}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm tracking-wide text-muted hover:text-foreground"
            >
              <span
                className="flex size-5 shrink-0 items-center justify-center border border-current text-[10px] font-semibold"
                aria-hidden
              >
                ?
              </span>
              Demo guide
            </button>
            */}
            <Link
              href="/admin/settings"
              className="block px-3 py-2 text-sm tracking-wide text-muted hover:text-foreground"
            >
              Settings
            </Link>
            {/* Client hub preview — kept but hidden
            <ClientHubPreview
              label="Preview client view"
              className="block w-full px-3 py-2"
            />
            */}
            <SignOutButton className="block w-full px-3 py-2 text-sm tracking-wide text-muted hover:text-foreground" />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-0">
          <header className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 lg:hidden">
            <Link href="/admin" className="flex min-w-0 items-center gap-2.5">
              <Image
                src="/images/brand/ma5-logo.jpeg"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0">
                <span className="block font-display text-base tracking-[0.08em] uppercase">
                  {siteConfig.shortName}
                </span>
              </div>
            </Link>
            <button
              type="button"
              className="inline-flex size-11 shrink-0 items-center justify-center border border-border text-foreground touch-manipulation"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="admin-mobile-menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <NavIcon name={menuOpen ? "close" : "menu"} />
            </button>
          </header>

          {menuOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                aria-label="Dismiss menu"
                onClick={() => setMenuOpen(false)}
              />
              <div
                id="admin-mobile-menu"
                className="absolute inset-x-0 top-[57px] z-50 max-h-[calc(100dvh-57px-4.25rem)] overflow-y-auto border-b border-border bg-surface shadow-lg lg:hidden"
              >
                <nav aria-label="More" className="flex flex-col p-2">
                  {SIDEBAR.map((item) => {
                    const active = isActive(pathname, item.href, item.match);
                    const showBadge =
                      item.match === "communication" &&
                      communicationUnread > 0;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex min-h-12 items-center justify-between gap-2 px-3 text-sm tracking-wide touch-manipulation",
                          active
                            ? "bg-brand/10 font-semibold text-foreground"
                            : "text-foreground",
                        )}
                        onClick={() => setMenuOpen(false)}
                      >
                        <span>{item.label}</span>
                        {showBadge ? (
                          <span className="flex h-5 min-w-5 items-center justify-center bg-brand px-1 text-[10px] font-semibold text-brand-foreground">
                            {communicationUnread > 9
                              ? "9+"
                              : communicationUnread}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                  <Link
                    href="/admin/settings"
                    className="flex min-h-12 items-center px-3 text-sm tracking-wide text-foreground touch-manipulation"
                    onClick={() => setMenuOpen(false)}
                  >
                    Settings
                  </Link>
                </nav>
                <div className="space-y-2 border-t border-border p-3">
                  <ThemeToggle className="w-full justify-start" />
                  {/* Client hub preview — kept but hidden
                  <ClientHubPreview
                    label="Preview client view"
                    className="block w-full px-3 py-2 text-sm"
                  />
                  */}
                  <SignOutButton
                    showIcon
                    className="flex min-h-12 w-full items-center gap-2 px-3 text-left text-sm tracking-wide text-muted"
                  />
                </div>
              </div>
            </>
          ) : null}

          <header className="sticky top-0 z-40 hidden items-center justify-end border-b border-border bg-background/95 px-6 py-2.5 backdrop-blur lg:flex">
            <ThemeToggle />
          </header>

          <main id="main-content" className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>

          <nav
            aria-label="Admin mobile"
            className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] lg:hidden"
          >
            <div className="mx-auto grid max-w-lg grid-cols-4">
              {MOBILE_TAB.map((item) => {
                const active = isActive(pathname, item.href, item.match);
                const showBadge =
                  item.match === "communication" && communicationUnread > 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative flex min-h-14 flex-col items-center justify-center touch-manipulation",
                      active ? "text-foreground" : "text-muted",
                    )}
                    aria-label={item.label}
                    title={item.label}
                  >
                    <NavIcon name={item.icon} />
                    {showBadge ? (
                      <span className="absolute top-1.5 right-[22%] flex h-4 min-w-4 items-center justify-center bg-brand px-0.5 text-[9px] font-semibold text-brand-foreground">
                        {communicationUnread > 9 ? "9+" : communicationUnread}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Demo mode — kept but hidden
        <DemoPreviewChrome
          showFloatingTrigger={false}
          open={demoOpen}
          onOpenChange={setDemoOpen}
        />
        */}
      </div>
    </HubThemeProvider>
  );
}
