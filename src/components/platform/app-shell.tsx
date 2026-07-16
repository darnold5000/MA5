"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { DemoPreviewChrome } from "@/components/platform/demo-preview";
import { SignOutButton } from "@/components/platform/sign-out-button";
import { siteConfig } from "@/content/site-config";
import { cn } from "@/lib/utils";

const SIDEBAR = [
  { href: "/app", label: "Home", match: "exact" as const },
  { href: "/app/schedule", label: "Reserve", match: "prefix" as const },
  { href: "/app/bookings", label: "My Training", match: "prefix" as const },
  { href: "/app/billing", label: "Plan", match: "prefix" as const },
  { href: "/app/programs", label: "Programs", match: "prefix" as const },
  { href: "/app/inbox", label: "Inbox", match: "prefix" as const },
] as const;

const MOBILE = [
  { href: "/app", label: "Home", match: "exact" as const },
  { href: "/app/schedule", label: "Reserve", match: "prefix" as const },
  { href: "/app/bookings", label: "Training", match: "prefix" as const },
  { href: "/app/billing", label: "Plan", match: "prefix" as const },
  { href: "/app/inbox", label: "Inbox", match: "prefix" as const },
] as const;

function isActive(pathname: string, href: string, match: "exact" | "prefix") {
  if (match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
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
  const firstName = memberName.split(" ")[0] ?? memberName;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/app" className="flex items-center gap-3 text-foreground lg:hidden">
            <Image
              src="/images/brand/ma5-logo.jpeg"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 rounded-full object-cover"
            />
            <span className="font-display text-lg tracking-[0.08em] uppercase">
              {siteConfig.shortName}
            </span>
          </Link>
          <p className="hidden font-display text-lg tracking-[0.08em] text-muted uppercase lg:block">
            {siteConfig.shortName}
            <span className="text-brand"> Performance</span>
          </p>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/app/inbox"
              className="relative inline-flex min-h-10 min-w-10 items-center justify-center border border-border text-muted transition hover:border-brand hover:text-foreground"
              aria-label={
                inboxUnread > 0
                  ? `Inbox, ${inboxUnread} unread`
                  : "Inbox"
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
            <Link
              href="/"
              className="hidden text-xs tracking-wide text-muted transition hover:text-foreground sm:inline sm:text-sm"
            >
              Website
            </Link>
            <SignOutButton className="text-xs font-semibold tracking-wide text-muted uppercase transition hover:text-foreground" />
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="sticky top-[53px] hidden h-[calc(100vh-53px)] w-56 shrink-0 flex-col border-r border-border bg-surface lg:flex">
          <div className="border-b border-border px-4 py-5">
            <Link href="/app" className="flex items-center gap-3">
              <Image
                src="/images/brand/ma5-logo.jpeg"
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover"
              />
              <span className="font-display text-xl tracking-[0.08em] uppercase">
                {siteConfig.shortName}
              </span>
            </Link>
            <div className="mt-5">
              <p className="text-sm text-foreground">{firstName}</p>
              <p className="mt-0.5 text-xs tracking-wide text-muted">
                {memberPlan}
              </p>
            </div>
          </div>
          <nav aria-label="App" className="flex flex-1 flex-col gap-1 p-3">
            {SIDEBAR.map((item) => {
              const active = isActive(pathname, item.href, item.match);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 py-2.5 text-sm tracking-wide transition",
                    active
                      ? "border-l-2 border-brand bg-brand/10 text-foreground"
                      : "border-l-2 border-transparent text-muted hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">
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
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 backdrop-blur lg:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {MOBILE.map((item) => {
            const active = isActive(pathname, item.href, item.match);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold tracking-wide uppercase",
                  active ? "text-brand" : "text-muted",
                )}
              >
                {item.label}
                {item.href === "/app/inbox" && inboxUnread > 0 ? (
                  <span className="absolute top-2 right-3 size-1.5 rounded-full bg-brand" />
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>

      <DemoPreviewChrome />
    </div>
  );
}
