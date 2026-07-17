import type { Metadata } from "next";
import Link from "next/link";

import { ManageBillingButton } from "@/components/billing/manage-billing-button";
import { SignOutButton } from "@/components/platform/sign-out-button";
import {
  demoClient,
  resolveClientFirstName,
  resolveClientFullName,
} from "@/content/demo-persona";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { getActiveMembershipForUser } from "@/lib/stripe/sync-membership";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: false },
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "MA";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function Field({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          {title}
        </p>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ToggleRow({
  label,
  description,
  defaultOn = true,
}: {
  label: string;
  description: string;
  defaultOn?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 border-b border-border py-3 last:border-0">
      <span>
        <span className="block text-sm text-foreground">{label}</span>
        <span className="mt-0.5 block text-xs text-muted">{description}</span>
      </span>
      <input
        type="checkbox"
        defaultChecked={defaultOn}
        className="mt-1 size-4 accent-[var(--brand)]"
      />
    </label>
  );
}

export default async function ProfilePage() {
  const session = isSupabasePublicConfigured()
    ? await getSessionUser()
    : null;

  const fullName = resolveClientFullName({
    email: session?.email ?? session?.profile?.email,
    fullName: session?.profile?.full_name,
  });
  const firstName = resolveClientFirstName({
    email: session?.email ?? session?.profile?.email,
    fullName: session?.profile?.full_name,
  });
  const email = session?.email ?? demoClient.email;
  const phone =
    session?.profile?.phone?.trim() || "(317) 555-0142";

  const membership = session
    ? await getActiveMembershipForUser(session.id)
    : null;

  const planName =
    membership?.productName ??
    (demoClient.membership.name !== "No active plan"
      ? demoClient.membership.name
      : "No active plan");
  const planStatus = membership?.status ?? demoClient.membership.status;
  const renewsOn =
    membership?.currentPeriodEnd
      ? new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(new Date(membership.currentPeriodEnd))
      : demoClient.membership.renewsOn || "—";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-end gap-5">
        <div
          className="flex size-20 shrink-0 items-center justify-center rounded-full border border-border bg-background font-display text-2xl tracking-wide text-foreground"
          aria-hidden
        >
          {initials(fullName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
            Profile
          </p>
          <h1 className="mt-1 font-display text-3xl tracking-wide uppercase">
            {fullName}
          </h1>
          <p className="mt-2 text-sm text-muted">
            Keep your contact info current so coaches can reach you.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-10 items-center border border-border px-3 text-[11px] font-semibold tracking-wide uppercase"
        >
          Change photo
        </button>
      </div>

      <Section
        title="Contact"
        action={
          <button
            type="button"
            className="text-xs font-semibold tracking-wide text-brand uppercase hover:underline"
          >
            Edit
          </button>
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name" value={fullName} />
          <Field label="Preferred name" value={firstName} />
          <Field label="Email" value={email} />
          <Field label="Phone" value={phone} />
        </div>
      </Section>

      <Section
        title="Emergency contact"
        action={
          <button
            type="button"
            className="text-xs font-semibold tracking-wide text-brand uppercase hover:underline"
          >
            Edit
          </button>
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" value="Pat Rivera" />
          <Field label="Relationship" value="Spouse" />
          <Field label="Phone" value="(317) 555-0199" />
          <Field
            label="Notes"
            value="Call if unreachable after session"
          />
        </div>
      </Section>

      <Section
        title="Membership"
        action={
          <Link
            href="/app/billing"
            className="text-xs font-semibold tracking-wide text-brand uppercase hover:underline"
          >
            Manage plan →
          </Link>
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Current plan" value={planName} />
          <Field
            label="Status"
            value={planStatus}
            hint={renewsOn !== "—" ? `Renews ${renewsOn}` : undefined}
          />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/app/billing"
            className="inline-flex min-h-11 items-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase"
          >
            View plans
          </Link>
          {session ? (
            <ManageBillingButton className="inline-flex min-h-11 items-center border border-border px-4 text-xs font-semibold tracking-wide uppercase" />
          ) : (
            <Link
              href="/app/billing"
              className="inline-flex min-h-11 items-center border border-border px-4 text-xs font-semibold tracking-wide uppercase"
            >
              Payment methods
            </Link>
          )}
        </div>
      </Section>

      <Section title="Waivers">
        <ul className="divide-y divide-border">
          {[
            {
              name: "Liability waiver",
              status: "Signed",
              when: "Jan 12, 2026",
              ok: true,
            },
            {
              name: "Facility rules acknowledgment",
              status: "Signed",
              when: "Jan 12, 2026",
              ok: true,
            },
            {
              name: "Photo / media release",
              status: "Not signed",
              when: "Optional",
              ok: false,
            },
          ].map((w) => (
            <li
              key={w.name}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div>
                <p className="text-sm text-foreground">{w.name}</p>
                <p className="mt-0.5 text-xs text-muted">{w.when}</p>
              </div>
              <span
                className={cn(
                  "text-xs font-semibold tracking-wide uppercase",
                  w.ok ? "text-emerald-400" : "text-amber-400",
                )}
              >
                {w.status}
              </span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-4 inline-flex min-h-10 items-center border border-border px-3 text-[11px] font-semibold tracking-wide uppercase"
        >
          Review waivers
        </button>
      </Section>

      <Section title="Notifications">
        <ToggleRow
          label="Coach messages"
          description="Email when your coach sends a message"
          defaultOn
        />
        <ToggleRow
          label="Session reminders"
          description="Reminders before booked facility sessions"
          defaultOn
        />
        <ToggleRow
          label="Program updates"
          description="When a new workout is published"
          defaultOn
        />
        <ToggleRow
          label="Billing alerts"
          description="Failed payments and renewal notices"
          defaultOn
        />
      </Section>

      <Section title="Password & security">
        <p className="text-sm text-muted">
          Signed in as <span className="text-foreground">{email}</span>
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex min-h-11 items-center border border-border px-4 text-xs font-semibold tracking-wide uppercase"
          >
            Change password
          </button>
          <SignOutButton className="inline-flex min-h-11 items-center border border-border px-4 text-xs font-semibold tracking-wide uppercase" />
        </div>
      </Section>
    </div>
  );
}
