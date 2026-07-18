"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin/marketing", label: "Overview", exact: true },
  { href: "/admin/marketing/leads", label: "Leads", exact: false },
  { href: "/admin/marketing/campaigns", label: "Campaigns", exact: false },
] as const;

export function MarketingSubnav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Growth"
      className="flex flex-wrap gap-2 border-b border-border pb-4"
    >
      {LINKS.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "inline-flex min-h-10 items-center px-3 text-xs font-semibold tracking-wide uppercase transition",
              active
                ? "border-b-2 border-brand text-foreground"
                : "text-muted hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
