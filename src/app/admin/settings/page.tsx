import type { Metadata } from "next";
import Link from "next/link";

import { FacilitySettingsForm } from "@/components/admin/facility-settings-form";
import {
  getFacilitySettings,
  listCoaches,
} from "@/features/settings/queries";
import { isStripeConfigured } from "@/lib/stripe";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Settings · Operations",
  robots: { index: false, follow: false },
};

export default async function AdminSettingsPage() {
  const [settings, coaches] = await Promise.all([
    getFacilitySettings(),
    listCoaches(),
  ]);
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
          Edit and save — photos, logo, and coach invites persist when Storage
          / Auth are configured.
        </p>
      </div>

      <FacilitySettingsForm
        key={`${JSON.stringify(settings)}-${coaches.length}`}
        initial={settings}
        coaches={coaches}
      />

      <section className="border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
              Memberships
            </p>
            <p className="mt-2 text-sm text-muted">
              Plans clients can buy — pricing and Stripe products.
            </p>
          </div>
          <Link
            href="/admin/products"
            className="text-xs font-semibold tracking-wide text-brand uppercase hover:underline"
          >
            Manage products →
          </Link>
        </div>
      </section>

      <section className="border border-border bg-surface p-5 sm:p-6">
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Stripe
        </p>
        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2 border-b border-border py-3">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">
            Status
          </p>
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
        </div>
        <p className="mt-4 text-xs text-muted">
          Keys live in environment variables — never paste secrets into Settings.
        </p>
      </section>

      <section className="border border-border bg-surface p-5 sm:p-6">
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Quick links
        </p>
        <div className="mt-4 divide-y divide-border border border-border bg-background">
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
      </section>
    </div>
  );
}
