import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthCallbackHandler } from "@/components/platform/auth-callback-handler";
import { safeAuthNextPath } from "@/lib/auth/auth-callback";

export const metadata: Metadata = {
  title: "Signing in",
  robots: { index: false, follow: false },
};

function CallbackContent({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const nextPath = safeAuthNextPath(searchParams.next ?? null);
  return <AuthCallbackHandler nextPath={nextPath} />;
}

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-full flex-1 items-start justify-center px-4 py-8 sm:items-center sm:py-12">
      <Suspense
        fallback={
          <p className="text-sm text-muted">Completing secure sign-in…</p>
        }
      >
        <CallbackContent searchParams={params} />
      </Suspense>
    </div>
  );
}
