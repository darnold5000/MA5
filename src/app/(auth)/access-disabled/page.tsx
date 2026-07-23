import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/platform/auth-card";
import { SignOutButton } from "@/components/platform/sign-out-button";
import {
  asClientStatus,
  portalStatusMessage,
} from "@/lib/auth/client-lifecycle";

export const metadata: Metadata = {
  title: "Access disabled",
  robots: { index: false, follow: false },
};

export default async function AccessDisabledPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = asClientStatus(params.status);
  const message = portalStatusMessage(status);

  return (
    <AuthCard title="Access unavailable" description="Your MA5 account cannot access the portal right now.">
      <p className="text-sm leading-relaxed text-muted">{message}</p>
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
