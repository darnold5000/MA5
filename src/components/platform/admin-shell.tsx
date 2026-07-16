"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ClientHubPreview } from "@/components/admin/client-hub-preview";
import { DemoPreviewChrome } from "@/components/platform/demo-preview";
import { SignOutButton } from "@/components/platform/sign-out-button";
import { siteConfig } from "@/content/site-config";
import { cn } from "@/lib/utils";

const SIDEBAR = [
  { href: "/admin", label: "Home", match: "exact" as const },
  { href: "/admin/schedule", label: "Schedule", match: "prefix" as const },
  { href: "/admin/clients", label: "Clients", match: "prefix" as const },
  { href: "/admin/inbox", label: "Inbox", match: "prefix" as const },
] as const;

const MOBILE = [
  { href: "/admin", label: "Home", match: "exact" as const },
  { href: "/admin/schedule", label: "Schedule", match: "prefix" as const },
  { href: "/admin/clients", label: "Clients", match: "prefix" as const },
  { href: "/admin/inbox", label: "Inbox", match: "prefix" as const },
  { href: "/admin/settings", label: "More", match: "prefix" as const },
] as const;

function isActive(pathname: string, href: string, match: "exact" | "prefix") {
  if (match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
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
              <span className="text-[10px] tracking-wide text-muted uppercase">
                Operations
              </span>
            </div>
          </Link>
        </div>
        <nav aria-label="Operations" className="flex flex-1 flex-col gap-1 p-3">
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
        <div className="mt-auto space-y-1 border-t border-border p-4">
          <Link
            href="/admin/settings"
            className="block px-3 py-2 text-sm tracking-wide text-muted hover:text-foreground"
          >
            Settings
          </Link>
          <ClientHubPreview
            label="Preview client view"
            className="block w-full px-3 py-2"
          />
          <SignOutButton className="block w-full px-3 py-2 text-sm tracking-wide text-muted hover:text-foreground" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:hidden">
          <Link href="/admin" className="flex items-center gap-2">
            <Image
              src="/images/brand/ma5-logo.jpeg"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover"
            />
            <div>
              <span className="block font-display text-sm tracking-wide uppercase">
                {siteConfig.shortName}
              </span>
              <span className="text-[10px] tracking-wide text-muted uppercase">
                Operations
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <ClientHubPreview
              label="Preview"
              className="text-xs font-semibold tracking-wide uppercase"
            />
            <SignOutButton className="text-xs font-semibold tracking-wide text-muted uppercase hover:text-foreground" />
          </div>
        </header>

        <main id="main-content" className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>

        <nav
          aria-label="Operations mobile"
          className="sticky bottom-0 grid grid-cols-5 border-t border-border bg-surface lg:hidden"
        >
          {MOBILE.map((item) => {
            const active = isActive(pathname, item.href, item.match);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center px-1 text-[10px] font-semibold tracking-wide uppercase",
                  active ? "text-brand" : "text-muted",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <DemoPreviewChrome />
    </div>
  );
}
