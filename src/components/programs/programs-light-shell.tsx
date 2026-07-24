import { cn } from "@/lib/utils";

/** Scoped TrainHeroic-style tokens for Programs / Library (theme-aware via globals.css). */
export function ProgramsLightShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("programs-th w-full", className)}>{children}</div>;
}
