import { cn } from "@/lib/utils";

/**
 * TrainHeroic-inspired light surface for Programs admin.
 * Scoped so the rest of Operations / marketing stay on MA5 dark tokens.
 */
export function ProgramsLightShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "programs-th -mx-4 -mb-6 min-h-[70vh] px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
