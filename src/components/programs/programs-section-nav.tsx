import Link from "next/link";

import { cn } from "@/lib/utils";

const ITEMS = [
  { id: "overview", href: "/admin/programs", label: "Overview" },
  { id: "teams", href: "/admin/programs/teams", label: "Small groups" },
  { id: "assign", href: "/admin/programs/assign", label: "Assign" },
  { id: "library", href: "/admin/programs/library", label: "Library" },
] as const;

export function ProgramsSectionNav({
  active,
}: {
  active: (typeof ITEMS)[number]["id"];
}) {
  return (
    <nav
      aria-label="Programs sections"
      className="flex flex-wrap items-center justify-start gap-1 border-b border-[var(--th-border)] pb-1"
    >
      {ITEMS.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={cn(
            "px-3 py-2 text-xs font-semibold tracking-wide uppercase transition",
            active === item.id
              ? "border-b-2 border-[var(--th-blue)] text-[var(--th-blue)]"
              : "text-[var(--th-muted)] hover:text-[var(--th-text)]",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
