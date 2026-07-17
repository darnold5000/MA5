import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { siteConfig } from "@/content/site-config";
import { isStripeConfigured } from "@/lib/stripe";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Settings · Operations",
  robots: { index: false, follow: false },
};

const COACHES = [
  {
    name: "Robert Anderson",
    role: "Owner · Head coach",
    email: "robert@ma5.com",
    focus: "Strength · Assessments",
  },
  {
    name: "Mike",
    role: "Coach",
    email: "mike@ma5.com",
    focus: "Sports performance · Programs",
  },
] as const;

function Section({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
            {title}
          </p>
          {description ? (
            <p className="mt-2 max-w-xl text-sm text-muted">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border py-3 last:border-0">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">
        {label}
      </p>
      <div className="text-sm text-foreground">{value}</div>
    </div>
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

export default function AdminSettingsPage() {
  const stripeReady = isStripeConfigured();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Operations
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase">
          Settings
        </h1>
        <p className="mt-2 text-sm text-muted">
          Gym information, coaches, memberships, and integrations — necessary,
          not glamorous.
        </p>
      </div>

      <Section
        title="Gym information"
        description="How MA5 shows up to clients and on the public site."
        action={
          <button
            type="button"
            className="text-xs font-semibold tracking-wide text-brand uppercase hover:underline"
          >
            Edit
          </button>
        }
      >
        <Row label="Name" value={siteConfig.name} />
        <Row label="Legal name" value={siteConfig.legalName} />
        <Row label="Address" value={siteConfig.location.fullAddress} />
        <Row
          label="Email"
          value={
            <a
              href={`mailto:${siteConfig.contact.email}`}
              className="hover:text-brand"
            >
              {siteConfig.contact.email}
            </a>
          }
        />
        <Row
          label="Map"
          value={
            <a
              href={siteConfig.location.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="text-brand hover:underline"
            >
              Open in Maps →
            </a>
          }
        />
      </Section>

      <Section
        title="Business hours"
        description="Open gym access and how coaching is scheduled."
      >
        <Row label="Open gym" value={siteConfig.hours.openGym} />
        <Row label="Coaching" value="By appointment" />
        <Row label="Summary" value={siteConfig.hours.summary} />
      </Section>

      <Section
        title="Coaches"
        description="Staff who can publish programs and run sessions."
        action={
          <button
            type="button"
            className="text-xs font-semibold tracking-wide text-brand uppercase hover:underline"
          >
            Invite coach
          </button>
        }
      >
        <ul className="divide-y divide-border">
          {COACHES.map((c) => (
            <li
              key={c.email}
              className="flex flex-wrap items-start justify-between gap-3 py-4"
            >
              <div>
                <p className="font-display text-lg tracking-wide uppercase">
                  {c.name}
                </p>
                <p className="mt-1 text-sm text-muted">{c.role}</p>
                <p className="mt-0.5 text-xs text-muted">{c.focus}</p>
              </div>
              <p className="text-sm text-muted">{c.email}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title="Memberships"
        description="Plans clients can buy — pricing and Stripe products."
        action={
          <Link
            href="/admin/products"
            className="text-xs font-semibold tracking-wide text-brand uppercase hover:underline"
          >
            Manage products →
          </Link>
        }
      >
        <p className="text-sm text-muted">
          Small-group packs, open gym, drop-ins, and add-ons live in Products
          &amp; pricing.
        </p>
        <Link
          href="/admin/products"
          className="mt-4 inline-flex min-h-11 items-center border border-border px-4 text-xs font-semibold tracking-wide uppercase"
        >
          Open products
        </Link>
      </Section>

      <Section
        title="Branding"
        description="Logo and brand colors used across Operations and the Hub."
      >
        <div className="flex flex-wrap items-center gap-5">
          <Image
            src="/images/brand/ma5-logo.jpeg"
            alt=""
            width={64}
            height={64}
            className="size-16 rounded-full object-cover"
          />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className="size-6 border border-border bg-brand"
                title="Brand red"
              />
              <span className="text-sm text-muted">Brand · #E2062B</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="size-6 border border-border bg-background"
                title="Background"
              />
              <span className="text-sm text-muted">Background · #0B0B0B</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="mt-5 inline-flex min-h-10 items-center border border-border px-3 text-[11px] font-semibold tracking-wide uppercase"
        >
          Replace logo
        </button>
      </Section>

      <Section
        title="Notification settings"
        description="What coaches and clients get notified about."
      >
        <ToggleRow
          label="Failed payment alerts"
          description="Email owners when a membership charge fails"
          defaultOn
        />
        <ToggleRow
          label="New client signups"
          description="Notify when someone joins or buys a plan"
          defaultOn
        />
        <ToggleRow
          label="Unread message digest"
          description="Morning summary of unanswered client messages"
          defaultOn
        />
        <ToggleRow
          label="Capacity warnings"
          description="Alert when a class is nearly full"
          defaultOn={false}
        />
      </Section>

      <Section
        title="Stripe"
        description="Payments, memberships, and the customer portal."
      >
        <Row
          label="Status"
          value={
            <span
              className={cn(
                "inline-flex items-center gap-2 text-sm font-semibold",
                stripeReady ? "text-emerald-400" : "text-amber-400",
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  stripeReady ? "bg-emerald-400" : "bg-amber-400",
                )}
              />
              {stripeReady ? "Connected" : "Not configured"}
            </span>
          }
        />
        <Row
          label="Portal"
          value="Clients update cards and cancel from Plan"
        />
        <p className="mt-4 text-xs text-muted">
          Keys live in environment variables — never paste secrets into Settings.
        </p>
      </Section>

      <Section title="Quick links">
        <div className="divide-y divide-border border border-border bg-background">
          {[
            {
              href: "/admin/schedule",
              title: "Schedule tools",
              body: "Publish and edit sessions.",
            },
            {
              href: "/admin/bookings",
              title: "Check-in roster",
              body: "Walk-ins and attendance.",
            },
            {
              href: "/admin/programs/library",
              title: "Library",
              body: "Programs, workouts, and exercises.",
            },
            {
              href: "/admin/reports",
              title: "Reports",
              body: "Revenue, bookings, and capacity.",
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-4 py-3 transition hover:bg-surface"
            >
              <p className="font-display text-base tracking-wide uppercase">
                {item.title}
              </p>
              <p className="mt-0.5 text-sm text-muted">{item.body}</p>
            </Link>
          ))}
        </div>
      </Section>

      <section className="border border-border bg-surface p-5">
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Coming later
        </p>
        <ul className="mt-4 space-y-2 text-sm text-muted">
          <li>Waiver template editor</li>
          <li>Staff roles & permissions UI</li>
          <li>AI insights on top of Reports</li>
        </ul>
      </section>
    </div>
  );
}
