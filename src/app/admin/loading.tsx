export default function AdminHubLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse space-y-6 py-2">
      <div className="h-10 w-56 rounded bg-surface-strong" />
      <div className="h-4 w-full max-w-lg rounded bg-surface" />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-24 rounded border border-border bg-surface" />
        <div className="h-24 rounded border border-border bg-surface" />
        <div className="h-24 rounded border border-border bg-surface" />
      </div>
      <div className="h-64 rounded border border-border bg-surface" />
    </div>
  );
}
