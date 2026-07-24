"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { AuthCard } from "@/components/platform/auth-card";
import { PasswordField } from "@/components/ui/password-field";
import { parseHashSessionTokens } from "@/lib/auth/auth-callback";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function establishSession() {
      if (!isSupabaseConfigured()) {
        if (!cancelled) {
          setSessionError("Password reset is not configured.");
        }
        return;
      }

      const supabase = createClient();

      const { accessToken, refreshToken } = parseHashSessionTokens(
        window.location.hash,
      );
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (!session) {
        setSessionError(
          "This reset link is invalid or has expired. Request a new one from the sign-in page.",
        );
        return;
      }

      setReady(true);
    }

    void establishSession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setPending(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        setError(updateError.message);
        setPending(false);
        return;
      }
      await supabase.auth.signOut();
      window.location.assign("/login?reset=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update password");
      setPending(false);
    }
  }

  if (sessionError) {
    return (
      <AuthCard title="Reset password" description="Unable to continue.">
        <p className="text-sm text-brand" role="alert">
          {sessionError}
        </p>
        <Link
          href="/forgot-password"
          className="mt-4 inline-flex min-h-10 w-full items-center justify-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase"
        >
          Request a new link
        </Link>
      </AuthCard>
    );
  }

  if (!ready) {
    return (
      <AuthCard title="Reset password" description="Validating your reset link…">
        <p className="text-sm text-muted">Loading…</p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset password"
      description="Choose a new password for your MA5 account."
    >
      <form className="space-y-3 sm:space-y-4" onSubmit={onSubmit}>
        <PasswordField
          label="New password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          minLength={8}
          required
        />
        <PasswordField
          label="Confirm password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          minLength={8}
          required
        />
        {error ? (
          <p className="text-sm text-brand" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-10 w-full items-center justify-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50 sm:min-h-11"
        >
          {pending ? "Saving…" : "Save password"}
        </button>
      </form>
    </AuthCard>
  );
}
