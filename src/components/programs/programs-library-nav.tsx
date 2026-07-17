import Link from "next/link";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/programs", label: "Overview", match: "exact" as const },
  { href: "/admin/programs/exercises", label: "Exercises", match: "prefix" as const },
  { href: "/admin/programs/workouts", label: "Workouts", match: "prefix" as const },
  { href: "/admin/programs/library", label: "Programs", match: "prefix" as const },
  { href: "/admin/programs/teams", label: "Teams", match: "prefix" as const },
  { href: "/admin/programs/assign", label: "Assign", match: "prefix" as const },
] as const;

export function ProgramsLibraryNav({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Programs library"
      className="flex flex-wrap gap-1 border-b border-border pb-3"
    >
      {TABS.map((tab) => {
        const active =
          tab.match === "exact"
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-3 py-2 text-xs font-semibold tracking-wide uppercase transition",
              active
                ? "border-b-2 border-brand text-foreground"
                : "text-muted hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
