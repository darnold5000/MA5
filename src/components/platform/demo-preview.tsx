"use client";

import { useEffect, useId, useState } from "react";

import { cn } from "@/lib/utils";

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
        aria-haspopup="dialog"
        aria-expanded={open}
        className="group fixed right-3 bottom-20 z-[60] flex items-center gap-2 border border-brand bg-surface px-3 py-2.5 text-left shadow-lg transition hover:bg-brand hover:text-brand-foreground md:bottom-4"
      >
        <span
          className="flex size-6 shrink-0 items-center justify-center border border-current text-[11px] font-semibold"
          aria-hidden
        >
          ?
        </span>
        <span className="leading-tight">
          <span className="block text-[10px] font-semibold tracking-[0.16em] uppercase">
            Demo guide
          </span>
          <span className="block text-[10px] opacity-70 group-hover:opacity-100">
            Open walkthrough
          </span>
        </span>
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
          aria-label="Close demo guide"
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
                How to test
              </p>
              <h2
                id={titleId}
                className="font-display text-xl tracking-wide uppercase"
              >
                Demo guide
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

          <div className="space-y-6 overflow-y-auto px-5 py-5 text-sm leading-relaxed text-muted">
            <p>
              This preview includes the client **Fitness Hub** and staff
              **Operations** center: schedule, reserve, memberships, Stripe
              Checkout (test mode), and Inbox. Use a real signed-in account for
              payments — demo-cookie browsing alone cannot complete Stripe.
            </p>

            <section>
              <p className="text-xs font-semibold tracking-wide text-foreground uppercase">
                Sign in (required)
              </p>
              <p className="mt-2">
                Go to{" "}
                <a href="/login" className="text-brand underline">
                  /login
                </a>{" "}
                and use the client test account:
              </p>
              <dl className="mt-3 space-y-2 border border-border bg-surface p-3 text-foreground">
                <div>
                  <dt className="text-[10px] font-semibold tracking-wide text-muted uppercase">
                    Email
                  </dt>
                  <dd className="mt-0.5 font-mono text-sm break-all">
                    ma5client@example.com
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold tracking-wide text-muted uppercase">
                    Password
                  </dt>
                  <dd className="mt-0.5 font-mono text-sm">1Password</dd>
                </div>
              </dl>
              <p className="mt-2 text-xs">
                Sign out first if you entered as “Continue as client” (demo
                persona) — that path skips Stripe auth.
              </p>
            </section>

            <section>
              <p className="text-xs font-semibold tracking-wide text-foreground uppercase">
                What you can try
              </p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>
                  <span className="text-foreground">Home</span> — next workout,
                  monthly progress, coach message
                </li>
                <li>
                  <span className="text-foreground">Reserve</span> — browse
                  schedule, reserve a spot (pay online or at facility)
                </li>
                <li>
                  <span className="text-foreground">My Training</span> —
                  confirmed / paid bookings, cancel unpaid
                </li>
                <li>
                  <span className="text-foreground">Plan</span> — membership
                  catalog + Stripe Checkout
                </li>
                <li>
                  <span className="text-foreground">Programs</span> — program
                  placeholder
                </li>
                <li>
                  <span className="text-foreground">Inbox</span> — Activity +
                  Messages (demo feed)
                </li>
              </ul>
            </section>

            <section>
              <p className="text-xs font-semibold tracking-wide text-foreground uppercase">
                End-to-end: book a session
              </p>
              <ol className="mt-2 list-decimal space-y-2 pl-5">
                <li>Sign in with the credentials above.</li>
                <li>
                  Open <span className="text-foreground">Reserve</span> and pick
                  a session.
                </li>
                <li>
                  Choose <span className="text-foreground">Pay online</span> or{" "}
                  <span className="text-foreground">Pay at facility</span>.
                </li>
                <li>
                  If paying online, complete Stripe Checkout with the test card
                  below.
                </li>
                <li>
                  Confirm the booking on{" "}
                  <span className="text-foreground">My Training</span> (Paid
                  online badge when applicable).
                </li>
              </ol>
            </section>

            <section>
              <p className="text-xs font-semibold tracking-wide text-foreground uppercase">
                End-to-end: membership (Stripe)
              </p>
              <ol className="mt-2 list-decimal space-y-2 pl-5">
                <li>Stay signed in as the client test account.</li>
                <li>
                  Open <span className="text-foreground">Plan</span>.
                </li>
                <li>
                  Choose a plan and start Checkout (Stripe test mode).
                </li>
                <li>Pay with the test card below.</li>
                <li>
                  Return to the app — Plan should show your active membership
                  and disable “Choose plan” on the current plan.
                </li>
              </ol>
            </section>

            <section>
              <p className="text-xs font-semibold tracking-wide text-foreground uppercase">
                Stripe test card
              </p>
              <dl className="mt-3 space-y-2 border border-border bg-surface p-3 text-foreground">
                <div>
                  <dt className="text-[10px] font-semibold tracking-wide text-muted uppercase">
                    Card number
                  </dt>
                  <dd className="mt-0.5 font-mono text-sm">
                    4242 4242 4242 4242
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold tracking-wide text-muted uppercase">
                    Expiry
                  </dt>
                  <dd className="mt-0.5 font-mono text-sm">
                    Any future date (e.g. 12/34)
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold tracking-wide text-muted uppercase">
                    CVC
                  </dt>
                  <dd className="mt-0.5 font-mono text-sm">Any 3 digits</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold tracking-wide text-muted uppercase">
                    ZIP
                  </dt>
                  <dd className="mt-0.5 font-mono text-sm">Any</dd>
                </div>
              </dl>
              <p className="mt-2 text-xs">
                No real charges — Stripe test mode only.
              </p>
            </section>

            <p className="border-t border-border pt-4 text-xs">
              Direction: replace Mindbody for booking, memberships, and client
              ops while keeping the public MA5 marketing site unchanged.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
