"use client";

import { useState } from "react";

type CheckoutButtonProps = {
  productSlug: string;
  label?: string;
  disabled?: boolean;
};

export function CheckoutButton({
  productSlug,
  label = "Checkout",
  disabled,
}: CheckoutButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productSlug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Checkout unavailable");
        setPending(false);
        return;
      }
      if (data.url) {
        window.location.href = data.url as string;
        return;
      }
      setError("No checkout URL returned");
      setPending(false);
    } catch {
      setError("Checkout failed");
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled || pending}
        onClick={onClick}
        className="inline-flex min-h-11 items-center justify-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50"
      >
        {pending ? "Starting…" : label}
      </button>
      {error ? (
        <p className="max-w-xs text-xs leading-relaxed text-brand" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
