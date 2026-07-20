"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { AuthCard } from "@/components/platform/auth-card";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        <label className="block space-y-1.5 text-sm sm:space-y-2">
          <span className="font-semibold tracking-wide uppercase">
            New password
          </span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="min-h-10 w-full border border-border bg-background px-3 pr-16 text-foreground outline-none sm:min-h-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 px-3 text-xs font-semibold tracking-wide text-muted uppercase hover:text-foreground"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>
        <label className="block space-y-1.5 text-sm sm:space-y-2">
          <span className="font-semibold tracking-wide uppercase">
            Confirm password
          </span>
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            className="min-h-10 w-full border border-border bg-background px-3 text-foreground outline-none sm:min-h-11"
          />
        </label>
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
