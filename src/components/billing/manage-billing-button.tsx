"use client";

import { useState } from "react";

export function ManageBillingButton() {
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url as string;
        return;
      }
      setOpen(true);
      setPending(false);
    } catch {
      setOpen(true);
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={onClick}
        className="inline-flex min-h-11 items-center justify-center border border-border px-4 text-xs font-semibold tracking-wide uppercase disabled:opacity-50"
      >
        {pending ? "Opening…" : "Manage billing"}
      </button>
      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md border border-border bg-background p-6"
          >
            <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
              Demo billing portal
            </p>
            <h2 className="mt-2 font-display text-2xl tracking-wide uppercase">
              Manage plan
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              In production this opens the Stripe Customer Portal so members can
              update payment methods, view invoices, and cancel. No live billing
              portal is connected in this preview.
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-6 inline-flex min-h-11 w-full items-center justify-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase"
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
