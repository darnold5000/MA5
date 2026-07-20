"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ClientHubPreview } from "@/components/admin/client-hub-preview";
import { DemoPreviewChrome } from "@/components/platform/demo-preview";
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
    label: "Communication",
    match: "communication" as const,
  },
] as const;

const MOBILE = [
  { href: "/admin", label: "Home", match: "exact" as const },
  { href: "/admin/schedule", label: "Schedule", match: "prefix" as const },
  { href: "/admin/clients", label: "Clients", match: "prefix" as const },
  { href: "/admin/reports", label: "Reports", match: "prefix" as const },
  { href: "/admin/settings", label: "More", match: "prefix" as const },
] as const;

function isActive(
  pathname: string,
  href: string,
  match: "exact" | "prefix" | "programs" | "communication" | "marketing",
) {
  if (match === "exact") return pathname === href;
  if (match === "programs") {
    return pathname === "/admin/programs" || pathname.startsWith("/admin/programs/");
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

export function AdminShell({
  children,
  communicationUnread = 0,
}: {
  children: React.ReactNode;
  communicationUnread?: number;
}) {
  const pathname = usePathname();
  const [demoOpen, setDemoOpen] = useState(false);
  const programsLight =
    pathname === "/admin/programs" || pathname.startsWith("/admin/programs/");

  return (
    <HubThemeProvider>
    <div
      className={cn(
        "flex min-h-full flex-1",
        programsLight ? "programs-th bg-[var(--th-bg)]" : "bg-background",
      )}
    >
      <aside
        className={cn(
          "sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r lg:flex",
          programsLight
            ? "border-[var(--th-border)] bg-[var(--th-surface)]"
            : "border-border bg-surface",
        )}
      >
        <div
          className={cn(
            "border-b px-4 py-5",
            programsLight ? "border-[var(--th-border)]" : "border-border",
          )}
        >
          <Link href="/admin" className="flex items-center gap-3">
            <Image
              src="/images/brand/ma5-logo.jpeg"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 rounded-full object-cover"
            />
            <div>
              <span
                className={cn(
                  "block font-display text-lg tracking-[0.08em] uppercase",
                  programsLight && "text-[var(--th-text)]",
                )}
              >
                {siteConfig.shortName}
              </span>
              <span
                className={cn(
                  "text-[10px] tracking-wide uppercase",
                  programsLight ? "text-[var(--th-muted)]" : "text-muted",
                )}
              >
                Operations
              </span>
            </div>
          </Link>
        </div>
        <nav aria-label="Operations" className="flex flex-1 flex-col gap-1 p-3">
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
                  programsLight
                    ? active
                      ? "border-l-2 border-[var(--th-blue)] bg-[var(--th-bg)] font-semibold text-[var(--th-blue)]"
                      : "border-l-2 border-transparent text-[var(--th-muted)] hover:text-[var(--th-text)]"
                    : active
                      ? "border-l-2 border-brand bg-brand/10 text-foreground"
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
        <div
          className={cn(
            "mt-auto space-y-1 border-t p-4",
            programsLight ? "border-[var(--th-border)]" : "border-border",
          )}
        >
          <ThemeToggle showLabel className="w-full" />
          <button
            type="button"
            onClick={() => setDemoOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={demoOpen}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-2 text-left text-sm tracking-wide",
              programsLight
                ? "text-[var(--th-muted)] hover:text-[var(--th-text)]"
                : "text-muted hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center border text-[10px] font-semibold",
                programsLight
                  ? "border-[var(--th-blue)] text-[var(--th-blue)]"
                  : "border-current",
              )}
              aria-hidden
            >
              ?
            </span>
            Demo guide
          </button>
          <Link
            href="/admin/settings"
            className={cn(
              "block px-3 py-2 text-sm tracking-wide",
              programsLight
                ? "text-[var(--th-muted)] hover:text-[var(--th-text)]"
                : "text-muted hover:text-foreground",
            )}
          >
            Settings
          </Link>
          <ClientHubPreview
            label="Preview client view"
            className={cn(
              "block w-full px-3 py-2",
              programsLight && "text-[var(--th-muted)]",
            )}
          />
          <SignOutButton
            className={cn(
              "block w-full px-3 py-2 text-sm tracking-wide",
              programsLight
                ? "text-[var(--th-muted)] hover:text-[var(--th-text)]"
                : "text-muted hover:text-foreground",
            )}
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={cn(
            "flex items-center justify-between border-b px-4 py-3 lg:hidden",
            programsLight
              ? "border-[var(--th-border)] bg-[var(--th-surface)]"
              : "border-border bg-surface",
          )}
        >
          <Link href="/admin" className="flex items-center gap-2">
            <Image
              src="/images/brand/ma5-logo.jpeg"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover"
            />
            <div>
              <span
                className={cn(
                  "block font-display text-sm tracking-wide uppercase",
                  programsLight && "text-[var(--th-text)]",
                )}
              >
                {siteConfig.shortName}
              </span>
              <span
                className={cn(
                  "text-[10px] tracking-wide uppercase",
                  programsLight ? "text-[var(--th-muted)]" : "text-muted",
                )}
              >
                Operations
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <ClientHubPreview
              label="Preview"
              className="text-xs font-semibold tracking-wide uppercase"
            />
            <SignOutButton
              className={cn(
                "text-xs font-semibold tracking-wide uppercase",
                programsLight
                  ? "text-[var(--th-muted)] hover:text-[var(--th-text)]"
                  : "text-muted hover:text-foreground",
              )}
            />
          </div>
        </header>

        <main
          id="main-content"
          className={cn(
            "flex-1 px-4 py-6 sm:px-6 lg:px-8",
            programsLight && "bg-[var(--th-bg)] text-[var(--th-text)]",
          )}
        >
          {children}
        </main>

        <nav
          aria-label="Operations mobile"
          className={cn(
            "sticky bottom-0 grid grid-cols-5 border-t lg:hidden",
            programsLight
              ? "border-[var(--th-border)] bg-[var(--th-surface)]"
              : "border-border bg-surface",
          )}
        >
          {MOBILE.map((item) => {
            const active = isActive(pathname, item.href, item.match);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center px-1 text-[10px] font-semibold tracking-wide uppercase",
                  programsLight
                    ? active
                      ? "text-[var(--th-blue)]"
                      : "text-[var(--th-muted)]"
                    : active
                      ? "text-brand"
                      : "text-muted",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <DemoPreviewChrome
        showFloatingTrigger={false}
        open={demoOpen}
        onOpenChange={setDemoOpen}
      />
    </div>
    </HubThemeProvider>
  );
}
