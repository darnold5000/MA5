"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { AuthCard } from "@/components/platform/auth-card";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function AcceptInviteForm() {
  const [email, setEmail] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function establishSession() {
      if (!isSupabaseConfigured()) {
        if (!cancelled) {
          setSessionError("Invitations are not configured.");
        }
        return;
      }

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (!session?.user) {
        setSessionError(
          "This invitation link is invalid or has expired. Ask MA5 staff to resend your invite.",
        );
        return;
      }

      setEmail(session.user.email ?? null);
      const metaName = session.user.user_metadata?.full_name;
      if (typeof metaName === "string" && metaName.trim()) {
        setFullName(metaName.trim());
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

    if (!acceptedTerms) {
      setError("Please accept the terms to continue");
      return;
    }
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
      const res = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, fullName }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        redirectTo?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "Unable to activate account");
        setPending(false);
        return;
      }

      window.location.assign(data.redirectTo ?? "/app");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to activate account",
      );
      setPending(false);
    }
  }

  if (sessionError) {
    return (
      <AuthCard title="Accept invitation" description="Unable to continue.">
        <p className="text-sm text-brand" role="alert">
          {sessionError}
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex min-h-10 w-full items-center justify-center border border-border px-5 text-xs font-semibold tracking-wide uppercase"
        >
          Go to sign in
        </Link>
      </AuthCard>
    );
  }

  if (!ready) {
    return (
      <AuthCard
        title="Accept invitation"
        description="Validating your invitation…"
      >
        <p className="text-sm text-muted">Loading…</p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Activate your account"
      description="Set your password to finish activating your MA5 member access. If you already had an account, this step updates your password and turns on platform access — it is not a forgotten-password notice."
    >
      <form className="space-y-3 sm:space-y-4" onSubmit={onSubmit}>
        <label className="block space-y-1.5 text-sm sm:space-y-2">
          <span className="font-semibold tracking-wide uppercase">Email</span>
          <input
            type="email"
            value={email ?? ""}
            readOnly
            className="min-h-10 w-full border border-border bg-background/60 px-3 text-muted outline-none sm:min-h-11"
          />
        </label>
        <label className="block space-y-1.5 text-sm sm:space-y-2">
          <span className="font-semibold tracking-wide uppercase">
            Full name
          </span>
          <input
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="min-h-10 w-full border border-border bg-background px-3 text-foreground outline-none sm:min-h-11"
          />
        </label>
        <label className="block space-y-1.5 text-sm sm:space-y-2">
          <span className="font-semibold tracking-wide uppercase">Password</span>
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
        <label className="flex items-start gap-3 text-sm text-muted">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-1"
          />
          <span>
            I agree to MA5 facility policies and understand that my membership
            access is managed by MA5 staff.
          </span>
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
          {pending ? "Activating…" : "Activate account"}
        </button>
      </form>
    </AuthCard>
  );
}
