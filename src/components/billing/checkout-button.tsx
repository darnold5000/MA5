"use client";

import { useState } from "react";

import { formatMoney } from "@/features/scheduling/format";

type CheckoutButtonProps = {
  productSlug: string;
  productName: string;
  priceCents: number;
  billingInterval: "month" | "one_time" | null;
  label?: string;
  disabled?: boolean;
};

export function CheckoutButton({
  productSlug,
  productName,
  priceCents,
  billingInterval,
  label = "Choose plan",
  disabled = false,
}: CheckoutButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    if (disabled) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productSlug }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      const message =
        data.error ??
        (res.status === 401
          ? "Sign in with your member account to continue to checkout."
          : `Checkout failed (${res.status}).`);
      setError(message);
      setPending(false);
    } catch {
      setError("Could not reach checkout. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending || disabled}
        onClick={startCheckout}
        className="inline-flex min-h-11 w-full items-center justify-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Starting…" : label}
      </button>
      {error ? (
        <p className="text-sm text-brand" role="alert">
          {error}
        </p>
      ) : null}
      <p className="text-[11px] text-muted">
        {formatMoney(priceCents)}
        {billingInterval === "month" ? " / month" : ""} — secure payment via
        Stripe.
      </p>
    </div>
  );
}
