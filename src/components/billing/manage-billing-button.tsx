"use client";

import { useState } from "react";

export function ManageBillingButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Portal unavailable");
        setPending(false);
        return;
      }
      if (data.url) {
        window.location.href = data.url as string;
        return;
      }
      setError("No portal URL returned");
      setPending(false);
    } catch {
      setError("Could not open billing portal");
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={onClick}
        className="inline-flex min-h-11 items-center justify-center border border-border px-4 text-xs font-semibold tracking-wide uppercase disabled:opacity-50"
      >
        {pending ? "Opening…" : "Manage billing"}
      </button>
      {error ? (
        <p className="max-w-sm text-xs leading-relaxed text-brand" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
