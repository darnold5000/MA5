import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/platform/auth-card";
import { SignOutButton } from "@/components/platform/sign-out-button";

export const metadata: Metadata = {
  title: "Access disabled",
  robots: { index: false, follow: false },
};

export default function AccessDisabledPage() {
  return (
    <AuthCard
      title="Access disabled"
      description="Your MA5 account is inactive or has been revoked."
    >
      <p className="text-sm leading-relaxed text-muted">
        Contact MA5 staff if you believe you should still have access.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <SignOutButton className="inline-flex min-h-10 w-full items-center justify-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase" />
        <Link
          href="/"
          className="inline-flex min-h-10 items-center justify-center border border-border px-5 text-xs font-semibold tracking-wide uppercase"
        >
          Back to site
        </Link>
      </div>
    </AuthCard>
  );
}
