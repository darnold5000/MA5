export function GrowthEmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="border border-border bg-surface p-6">
      <p className="font-display text-lg tracking-wide uppercase">{title}</p>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}
