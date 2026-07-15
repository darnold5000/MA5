"use client";

import { useEffect, useId, useState } from "react";

import { cn } from "@/lib/utils";

const STORAGE_KEY = "ma5_demo_preview_open";

export function DemoPreviewChrome() {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-3 bottom-20 z-[60] border border-border bg-surface px-3 py-2 text-[10px] font-semibold tracking-[0.18em] text-muted uppercase shadow-lg transition hover:border-brand hover:text-foreground md:bottom-4"
      >
        Demo Preview
      </button>

      <div
        className={cn(
          "fixed inset-0 z-[70] transition",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-black/60 transition",
            open ? "opacity-100" : "opacity-0",
          )}
          aria-label="Close demo information"
          onClick={() => setOpen(false)}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={cn(
            "absolute top-0 right-0 flex h-full w-full max-w-md flex-col border-l border-border bg-background transition-transform duration-200",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
                Preview info
              </p>
              <h2 id={titleId} className="font-display text-xl tracking-wide uppercase">
                Demo Preview
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm text-muted hover:text-foreground"
            >
              Close
            </button>
          </div>
          <div className="space-y-5 overflow-y-auto px-5 py-5 text-sm leading-relaxed text-muted">
            <p>
              This preview uses sample data so you can experience the client
              portal the way members would. Payments and live account creation
              are disabled until production credentials are connected.
            </p>
            <div>
              <p className="text-xs font-semibold tracking-wide text-foreground uppercase">
                Working in this preview
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Browse schedule and reserve sessions</li>
                <li>View bookings with calendar filters</li>
                <li>Explore membership plans</li>
                <li>Staff admin overview screens</li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-foreground uppercase">
                Production would connect
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>MA5 database for real accounts and bookings</li>
                <li>Stripe for memberships and billing</li>
                <li>Email notifications and coach messaging</li>
              </ul>
            </div>
            <p>
              Direction: replace Mindbody for booking, memberships, and client
              management while keeping the public MA5 website look and feel.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

// Keep unused key referenced for future persistence if needed.
void STORAGE_KEY;
