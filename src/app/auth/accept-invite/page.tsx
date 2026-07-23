import type { Metadata } from "next";

import { AcceptInviteForm } from "@/components/platform/accept-invite-form";
import { AuthCard } from "@/components/platform/auth-card";
import { SignOutButton } from "@/components/platform/sign-out-button";
import {
  resolveInviteAccess,
  stampValidatedInviteGeneration,
} from "@/lib/auth/invite-access";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Accept invitation",
  robots: { index: false, follow: false },
};

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ igen?: string }>;
}) {
  const params = await searchParams;
  const linkGeneration = params.igen
    ? Number.parseInt(params.igen, 10)
    : null;
  const access = await resolveInviteAccess(linkGeneration);

  if (!access.ok) {
    const showSignOut =
      access.code === "email_mismatch" ||
      access.code === "already_active" ||
      access.code === "stale_invite";

    return (
      <div className="flex min-h-full flex-1 items-start justify-center px-4 py-8 sm:items-center sm:py-12">
        <AuthCard title="Accept invitation" description="Unable to continue.">
          <p className="text-sm text-brand" role="alert">
            {access.message}
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {showSignOut ? (
              <SignOutButton className="inline-flex min-h-10 w-full items-center justify-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase" />
            ) : null}
            <Link
              href="/login"
              className="inline-flex min-h-10 w-full items-center justify-center border border-border px-5 text-xs font-semibold tracking-wide uppercase"
            >
              Go to sign in
            </Link>
          </div>
        </AuthCard>
      </div>
    );
  }

  await stampValidatedInviteGeneration(access.inviteGeneration);

  return (
    <div className="flex min-h-full flex-1 items-start justify-center px-4 py-8 sm:items-center sm:py-12">
      <AcceptInviteForm
        email={access.email}
        fullName={access.fullName}
      />
    </div>
  );
}
