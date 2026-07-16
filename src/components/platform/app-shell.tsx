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

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      {/* Same brand bar as the public site — keeps website ↔ hub one product */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/app" className="flex items-center gap-3 text-foreground">
            <Image
              src="/images/brand/ma5-logo.jpeg"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover"
            />
            <span className="font-display text-xl tracking-[0.08em] uppercase sm:text-2xl">
              {siteConfig.shortName}
              <span className="text-brand"> Performance</span>
            </span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-5">
            <span className="hidden text-[10px] font-semibold tracking-[0.18em] text-muted uppercase sm:inline">
              Fitness Hub
            </span>
            <Link
              href="/"
              className="text-xs tracking-wide text-muted transition hover:text-foreground sm:text-sm"
            >
              Website
            </Link>
            <SignOutButton className="text-xs font-semibold tracking-wide text-muted uppercase transition hover:text-foreground" />
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-56 shrink-0 flex-col border-r border-border bg-surface lg:flex">
          <nav aria-label="Fitness Hub" className="flex flex-1 flex-col gap-1 p-3">
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
        aria-label="Fitness Hub mobile"
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
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold tracking-wide uppercase",
                  active ? "text-brand" : "text-muted",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <DemoPreviewChrome />
    </div>
  );
}
