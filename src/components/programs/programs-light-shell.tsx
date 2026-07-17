import { cn } from "@/lib/utils";

/**
 * Content wrapper for Programs pages.
 * Full-window light chrome is applied by AdminShell on /admin/programs/*.
 */
export function ProgramsLightShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("programs-th w-full", className)}>{children}</div>;
}
