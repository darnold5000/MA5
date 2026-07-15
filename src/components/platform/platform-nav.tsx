"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const CLIENT_NAV = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/schedule", label: "Schedule" },
  { href: "/app/bookings", label: "Bookings" },
  { href: "/app/billing", label: "Billing" },
  { href: "/login", label: "Account" },
] as const;

const ADMIN_NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/schedule", label: "Schedule" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/products", label: "Products" },
] as const;

export function ClientAppNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Client app"
      className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-3 sm:px-6 lg:px-8"
    >
      {CLIENT_NAV.map((item) => {
        const active =
          item.href === "/app"
            ? pathname === "/app"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center border px-3 text-xs font-semibold tracking-wide uppercase transition",
              active
                ? "border-brand bg-brand text-brand-foreground"
                : "border-border text-muted hover:border-brand hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminAppNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Admin"
      className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-3 sm:px-6 lg:px-8"
    >
      {ADMIN_NAV.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center border px-3 text-xs font-semibold tracking-wide uppercase transition",
              active
                ? "border-brand bg-brand text-brand-foreground"
                : "border-border text-muted hover:border-brand hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
