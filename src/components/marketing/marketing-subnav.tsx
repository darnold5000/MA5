"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const ACTIVE_LINKS = [
  { href: "/admin/marketing", label: "Overview", exact: true },
  { href: "/admin/marketing/leads", label: "Leads", exact: false },
  { href: "/admin/marketing/campaigns", label: "Campaigns", exact: false },
] as const;

/** Reserved for later Growth modules — visible but not built yet. */
const COMING_SOON = [
  "Landing Pages",
  "Referrals",
  "Promotions",
  "Email",
  "Reviews",
] as const;

export function MarketingSubnav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Growth"
      className="flex flex-wrap items-center gap-2 border-b border-border pb-4"
    >
      {ACTIVE_LINKS.map((link) => {
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
      {COMING_SOON.map((label) => (
        <span
          key={label}
          title="Coming later"
          className="inline-flex min-h-10 cursor-default items-center gap-1.5 px-3 text-xs font-semibold tracking-wide text-muted/50 uppercase"
        >
          {label}
          <span className="text-[10px] font-semibold normal-case tracking-normal">
            soon
          </span>
        </span>
      ))}
    </nav>
  );
}
