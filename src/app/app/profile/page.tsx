import type { Metadata } from "next";
import Link from "next/link";

import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import {
  demoClient,
  resolveClientFullName,
} from "@/content/demo-persona";
import { SignOutButton } from "@/components/platform/sign-out-button";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const session = isSupabasePublicConfigured()
    ? await getSessionUser()
    : null;

  const name = resolveClientFullName({
    email: session?.email ?? session?.profile?.email,
    fullName: session?.profile?.full_name,
  });
  const email = session?.email ?? demoClient.email;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Profile
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase">
          {name}
        </h1>
        <p className="mt-2 text-sm text-muted">{email}</p>
      </div>

      <section className="space-y-3 border border-border bg-surface p-5">
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Coming soon
        </p>
        <ul className="space-y-2 text-sm text-muted">
          <li>Goals</li>
          <li>Membership & payment methods</li>
          <li>Emergency contact & waivers</li>
          <li>Notification preferences</li>
        </ul>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/app/billing"
          className="inline-flex min-h-11 items-center border border-border px-4 text-xs font-semibold tracking-wide uppercase"
        >
          Manage plan
        </Link>
        <SignOutButton className="inline-flex min-h-11 items-center border border-border px-4 text-xs font-semibold tracking-wide uppercase" />
      </div>
    </div>
  );
}
