export default function ClientHubLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse space-y-6 py-2">
      <div className="h-8 w-48 rounded bg-surface-strong" />
      <div className="h-4 w-full max-w-md rounded bg-surface" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-32 rounded border border-border bg-surface" />
        <div className="h-32 rounded border border-border bg-surface" />
      </div>
      <div className="h-48 rounded border border-border bg-surface" />
    </div>
  );
}
