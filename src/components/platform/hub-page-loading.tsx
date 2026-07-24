type HubPageLoadingProps = {
  variant?: "table" | "cards" | "library";
};

export function HubPageLoading({ variant = "cards" }: HubPageLoadingProps) {
  if (variant === "table") {
    return (
      <div className="animate-pulse space-y-4">
        <div className="flex justify-between gap-3">
          <div className="h-9 w-40 rounded bg-surface-strong" />
          <div className="h-11 w-32 rounded bg-surface-strong" />
        </div>
        <div className="overflow-hidden rounded border border-border">
          <div className="h-10 border-b border-border bg-surface" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-4 border-b border-border px-4 py-4 last:border-b-0"
            >
              <div className="h-4 w-32 rounded bg-surface-strong" />
              <div className="h-4 flex-1 rounded bg-surface" />
              <div className="h-4 w-20 rounded bg-surface" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "library") {
    return (
      <div className="animate-pulse space-y-4">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 w-24 rounded bg-surface-strong" />
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-[240px_1fr]">
          <div className="h-96 rounded border border-border bg-surface" />
          <div className="h-96 rounded border border-border bg-surface" />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 w-64 rounded bg-surface-strong" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-28 rounded border border-border bg-surface"
          />
        ))}
      </div>
    </div>
  );
}
