"use client";

import { useEffect, useId, useState } from "react";

import { cn } from "@/lib/utils";

type DemoPreviewChromeProps = {
  /** Floating FAB. Off when a sidebar trigger is used (admin). */
  showFloatingTrigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function DemoPreviewChrome({
  showFloatingTrigger = true,
  open: controlledOpen,
  onOpenChange,
}: DemoPreviewChromeProps = {}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    onOpenChange?.(next);
    if (controlledOpen === undefined) setUncontrolledOpen(next);
  };
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
      {showFloatingTrigger ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={cn(
            "group fixed right-3 bottom-20 z-[60] flex items-center gap-2 border border-brand bg-surface px-3 py-2.5 text-left shadow-lg transition hover:bg-brand hover:text-brand-foreground md:bottom-4",
          )}
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
      ) : null}

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
              This preview is MA5’s Mindbody replacement: the public website,
              the member <span className="text-foreground">Fitness Hub</span>,
              and staff <span className="text-foreground">Operations</span>,
              including Stripe test Checkout.
            </p>

            <section>
              <p className="text-xs font-semibold tracking-wide text-foreground uppercase">
                Client login → Fitness Hub
              </p>
              <p className="mt-2">
                On the marketing site header,{" "}
                <span className="text-foreground">Client login</span> opens
                sign-in. After you authenticate (or if you’re already signed
                in), it becomes{" "}
                <span className="text-foreground">Fitness Hub</span> and takes
                you into the member app.
              </p>
              <p className="mt-2">
                The Fitness Hub is where members live day to day — not a
                separate website.{" "}
                <span className="text-foreground">Book Now</span> also lands in
                Reserve (schedule) inside the hub.
              </p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5">
                <li>
                  <span className="text-foreground">Home</span> — greeting,
                  sessions used / streak, next workout with status chips, coach
                  message
                </li>
                <li>
                  <span className="text-foreground">Reserve</span> — browse and
                  book sessions (pay online or at facility)
                </li>
                <li>
                  <span className="text-foreground">My Training</span> —
                  upcoming bookings, paid / confirmed, cancel unpaid
                </li>
                <li>
                  <span className="text-foreground">Plan</span> — memberships +
                  Stripe Checkout
                </li>
                <li>
                  <span className="text-foreground">Programs</span> — program /
                  workout placeholder
                </li>
                <li>
                  <span className="text-foreground">Inbox</span> — Activity +
                  Messages (coach, booking, payment notices)
                </li>
                <li>
                  Top bell → Inbox;{" "}
                  <span className="text-foreground">Back to Website</span>{" "}
                  returns to the marketing site (you stay signed in)
                </li>
              </ul>
            </section>

            <section>
              <p className="text-xs font-semibold tracking-wide text-foreground uppercase">
                Sign in for payments
              </p>
              <p className="mt-2">
                Sign in with a real account for Stripe Checkout and membership.
              </p>
              <p className="mt-2">
                Go to{" "}
                <a href="/login" className="text-brand underline">
                  /login
                </a>{" "}
                with the client account:
              </p>
              <dl className="mt-3 space-y-2 border border-border bg-surface p-3 text-foreground">
                <div>
                  <dt className="text-[10px] font-semibold tracking-wide text-muted uppercase">
                    Name
                  </dt>
                  <dd className="mt-0.5 text-sm">Alex</dd>
                </div>
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
            </section>

            <section>
              <p className="text-xs font-semibold tracking-wide text-foreground uppercase">
                Operations (staff)
              </p>
              <p className="mt-2">
                Sign in as coach Mike, then open{" "}
                <a href="/admin" className="text-brand underline">
                  /admin
                </a>
                . Coaches land in Operations automatically after login.
              </p>
              <dl className="mt-3 space-y-2 border border-border bg-surface p-3 text-foreground">
                <div>
                  <dt className="text-[10px] font-semibold tracking-wide text-muted uppercase">
                    Email
                  </dt>
                  <dd className="mt-0.5 font-mono text-sm break-all">
                    mike@ma5.com
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold tracking-wide text-muted uppercase">
                    Password
                  </dt>
                  <dd className="mt-0.5 font-mono text-sm">1Password</dd>
                </div>
              </dl>
              <ul className="mt-3 list-disc space-y-1.5 pl-5">
                <li>
                  <span className="text-foreground">Home</span> — today’s
                  snapshot (sessions, check-ins, revenue placeholder, messages),
                  Needs Attention list, upcoming session cards with View roster
                </li>
                <li>
                  <span className="text-foreground">Schedule</span> — create /
                  edit / cancel classes (start time + length in minutes)
                </li>
                <li>
                  <span className="text-foreground">Clients</span> — add
                  clients, activate / deactivate, notes
                </li>
                <li>
                  <span className="text-foreground">Inbox</span> — messages
                  waiting for coach reply
                </li>
                <li>
                  <span className="text-foreground">Settings</span> — products &
                  pricing, check-in roster, schedule tools
                </li>
                <li>
                  <span className="text-foreground">Preview client view</span> —
                  Fitness Hub in a modal (Close preview returns to Operations)
                </li>
              </ul>
            </section>

            <section>
              <p className="text-xs font-semibold tracking-wide text-foreground uppercase">
                End-to-end: book a session
              </p>
              <ol className="mt-2 list-decimal space-y-2 pl-5">
                <li>Sign in with the client credentials above.</li>
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
                  Confirm on{" "}
                  <span className="text-foreground">My Training</span> (Paid
                  online when applicable).
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
                <li>Choose a plan and start Checkout.</li>
                <li>Pay with the test card below.</li>
                <li>
                  Return — Plan should show the active membership and disable
                  “Choose plan” on the current plan.
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
