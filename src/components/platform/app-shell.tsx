"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { DemoPreviewChrome } from "@/components/platform/demo-preview";
import { SignOutButton } from "@/components/platform/sign-out-button";
import { siteConfig } from "@/content/site-config";
import { cn } from "@/lib/utils";

const SIDEBAR = [
  { href: "/app", label: "Overview", match: "exact" as const },
  { href: "/app/schedule", label: "Book", match: "prefix" as const },
  { href: "/app/bookings", label: "My Schedule", match: "prefix" as const },
  { href: "/app/billing", label: "Membership", match: "prefix" as const },
  { href: "/app/programs", label: "Programs", match: "prefix" as const },
  { href: "/app/messages", label: "Messages", match: "prefix" as const },
] as const;

const MOBILE = [
  { href: "/app", label: "Home", match: "exact" as const },
  { href: "/app/schedule", label: "Book", match: "prefix" as const },
  { href: "/app/bookings", label: "Schedule", match: "prefix" as const },
  { href: "/app/billing", label: "Plans", match: "prefix" as const },
  { href: "/app/programs", label: "Programs", match: "prefix" as const },
] as const;

function isActive(pathname: string, href: string, match: "exact" | "prefix") {
  if (match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full flex-1 bg-background">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="border-b border-border px-4 py-5">
          <Link href="/app" className="flex items-center gap-3">
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
        </div>
        <nav aria-label="Client app" className="flex flex-1 flex-col gap-1 p-3">
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
        <div className="space-y-3 border-t border-border p-4">
          <SignOutButton className="block w-full px-3 py-2 text-sm tracking-wide text-muted hover:text-foreground" />
          <Link
            href="/"
            className="block text-xs text-muted transition hover:text-foreground"
          >
            ← Public website
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/app" className="flex items-center gap-2">
              <Image
                src="/images/brand/ma5-logo.jpeg"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover"
              />
              <span className="font-display text-base tracking-[0.08em] uppercase">
                {siteConfig.shortName}
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <SignOutButton className="text-xs font-semibold tracking-wide text-muted uppercase hover:text-foreground" />
              <Link href="/" className="text-xs text-muted">
                Website
              </Link>
            </div>
          </div>
        </header>

        <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>

      <nav
        aria-label="Mobile"
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
