import type { Metadata } from "next";
import Link from "next/link";

import { StatusBanner } from "@/components/platform/status-banner";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { canAccessAdmin } from "@/lib/permissions/roles";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminOverviewPage() {
  const configured = isSupabasePublicConfigured();
  const session = configured ? await getSessionUser() : null;
  const allowed = session ? canAccessAdmin(session.roles) : false;

  return (
    <div className="space-y-6">
      <StatusBanner title="Admin foundation">
        Schedule management, check-in, products, media, messaging, and analytics
        screens will be added on the feature demo branches. This overview only
        establishes the staff shell and role gates.
      </StatusBanner>

      {configured && session && !allowed ? (
        <StatusBanner tone="warning" title="Staff role required">
          Signed in as {session.email} with roles: {session.roles.join(", ")}.
          Ask an owner/admin to grant a staff-oriented role in{" "}
          <code>ma5_user_roles</code>.
        </StatusBanner>
      ) : null}

      <section className="border border-border bg-surface p-6">
        <h2 className="font-display text-2xl tracking-wide uppercase">
          Coming next
        </h2>
        <ul className="mt-4 space-y-2 text-sm text-muted">
          <li>Clients, attendance, and class schedule (Mindbody replacement)</li>
          <li>Products, memberships, and billing review (Stripe)</li>
          <li>Exercises, workouts, programs, and media library</li>
          <li>Messaging and AI analytics demos</li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/platform-preview"
            className="inline-flex min-h-11 items-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase"
          >
            View demo roadmap
          </Link>
          <Link
            href="/app"
            className="inline-flex min-h-11 items-center border border-border px-5 text-xs font-semibold tracking-wide uppercase"
          >
            Client app
          </Link>
        </div>
      </section>
    </div>
  );
}
