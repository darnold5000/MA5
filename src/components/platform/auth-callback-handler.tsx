"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { AuthCard } from "@/components/platform/auth-card";
import {
  isOtpVerifyType,
  messageForAuthHashError,
  parseHashAuthError,
  parseHashSessionTokens,
  safeAuthNextPath,
} from "@/lib/auth/auth-callback";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type AuthCallbackHandlerProps = {
  nextPath: string;
};

/**
 * Client-side auth callback — required because invite/recovery links may arrive
 * as URL hash fragments (#access_token=...) which server routes cannot read.
 */
export function AuthCallbackHandler({ nextPath }: AuthCallbackHandlerProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function completeAuthCallback() {
      if (!isSupabaseConfigured()) {
        if (!cancelled) {
          setError("Authentication is not configured.");
        }
        return;
      }

      const supabase = createClient();
      const url = new URL(window.location.href);
      const destination = safeAuthNextPath(nextPath);

      const hashError = parseHashAuthError(window.location.hash);
      if (hashError) {
        if (!cancelled) {
          setError(messageForAuthHashError(hashError));
        }
        return;
      }

      // Avoid bleeding a previous signed-in account into invite/recovery flows.
      await supabase.auth.signOut({ scope: "local" });

      const code = url.searchParams.get("code");
      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (!exchangeError) {
          window.location.replace(destination);
          return;
        }
        console.error("[auth/callback] exchangeCodeForSession", exchangeError.message);
      }

      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type");
      if (tokenHash && isOtpVerifyType(type)) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        });
        if (!verifyError) {
          window.location.replace(destination);
          return;
        }
        console.error("[auth/callback] verifyOtp", verifyError.message);
      }

      const { accessToken, refreshToken } = parseHashSessionTokens(
        window.location.hash,
      );
      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!sessionError) {
          window.location.replace(destination);
          return;
        }
        console.error("[auth/callback] setSession", sessionError.message);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        window.location.replace(destination);
        return;
      }

      if (!cancelled) {
        setError(
          "This sign-in link is invalid or has already been used. Request a new invitation or password reset email.",
        );
      }
    }

    void completeAuthCallback();

    return () => {
      cancelled = true;
    };
  }, [nextPath]);

  if (error) {
    return (
      <AuthCard title="Sign-in link" description="Unable to continue.">
        <p className="text-sm text-brand" role="alert">
          {error}
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <Link
            href="/forgot-password"
            className="inline-flex min-h-10 w-full items-center justify-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase"
          >
            Request a new link
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-10 w-full items-center justify-center border border-border px-5 text-xs font-semibold tracking-wide uppercase"
          >
            Go to sign in
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Signing you in" description="Completing secure sign-in…">
      <p className="text-sm text-muted">Loading…</p>
    </AuthCard>
  );
}
