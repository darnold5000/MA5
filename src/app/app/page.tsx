import type { Metadata } from "next";
import Link from "next/link";

import { StatusBanner } from "@/components/platform/status-banner";
import { isSupabasePublicConfigured } from "@/lib/env";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Client dashboard",
  robots: { index: false, follow: false },
};

export default async function ClientDashboardPage() {
  const configured = isSupabasePublicConfigured();
  const session = configured ? await getSessionUser() : null;

  return (
    <div className="space-y-6">
      <StatusBanner title="Foundation shell">
        This is the client app shell. Booking, memberships, Stripe billing, and
        programs will land on the Mindbody-replacement and programs demo
        branches. The public website look and feel is intentionally untouched.
      </StatusBanner>

      {!configured ? (
        <StatusBanner tone="warning" title="Supabase not connected">
          Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then apply{" "}
          <code>supabase/migrations/001_platform_foundation.sql</code>.
        </StatusBanner>
      ) : null}

      <section className="border border-border bg-surface p-6">
        <h2 className="font-display text-2xl tracking-wide uppercase">
          Welcome{session?.profile?.full_name ? `, ${session.profile.full_name}` : ""}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {session
            ? `Signed in as ${session.email}. Roles: ${session.roles.join(", ")}.`
            : "Sign in once Supabase is configured to personalize this dashboard."}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase"
          >
            Sign in
          </Link>
          <Link
            href="/platform-preview"
            className="inline-flex min-h-11 items-center border border-border px-5 text-xs font-semibold tracking-wide uppercase"
          >
            Platform previews
          </Link>
          <a
            href="https://www.mindbodyonline.com/explore/locations/ma5fitness-llc"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center border border-border px-5 text-xs font-semibold tracking-wide uppercase"
          >
            Current Mindbody booking
          </a>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Bookings",
            body: "Native class and appointment booking arrives on demo/mindbody-replacement.",
          },
          {
            title: "Billing",
            body: "Memberships, packages, and the Stripe customer portal land with payments.",
          },
          {
            title: "Programs",
            body: "Assigned workouts and video playback land on demo/ma5-programs.",
          },
        ].map((card) => (
          <div key={card.title} className="border border-border bg-surface p-5">
            <h3 className="font-display text-xl tracking-wide uppercase">
              {card.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{card.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
