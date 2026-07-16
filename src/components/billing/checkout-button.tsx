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
  const [open, setOpen] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
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
      // Real auth/Stripe misconfig — surface it. Demo persona gets the preview.
      const message =
        data.error ?? `Checkout failed (${res.status}). Sign in with a real account to pay.`;
      if (res.status === 401) {
        setError(message);
        setPending(false);
        return;
      }
      setDemoMode(true);
      setOpen(true);
      setPending(false);
    } catch {
      setDemoMode(true);
      setOpen(true);
      setPending(false);
    }
  }

  return (
    <>
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
      </div>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-demo-title"
            className="w-full max-w-md border border-border bg-background p-6"
          >
            <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
              {demoMode ? "Demo checkout preview" : "Checkout"}
            </p>
            <h2
              id="checkout-demo-title"
              className="mt-2 font-display text-2xl tracking-wide uppercase"
            >
              {productName}
            </h2>
            <p className="mt-3 text-sm text-muted">
              {formatMoney(priceCents)}
              {billingInterval === "month" ? " / month" : ""}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              In production, this continues to secure Stripe Checkout. No payment
              is processed in this preview.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-11 flex-1 items-center justify-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase"
              >
                Got it
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-11 items-center border border-border px-4 text-xs font-semibold tracking-wide uppercase"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
