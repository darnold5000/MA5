"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { AuthCard } from "@/components/platform/auth-card";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      // Only surface validation errors (e.g. malformed email). Existence of an
      // account must never change the success copy.
      if (!res.ok && res.status === 400) {
        setError(data.error ?? "Enter a valid email address");
        setPending(false);
        return;
      }

      setSent(true);
      setPending(false);
    } catch {
      // Network failure: still show the generic confirmation so callers cannot
      // distinguish "no account" from transport errors by UI copy alone.
      setSent(true);
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Forgot password"
      description="Enter your email and we will send a secure reset link if an account exists."
    >
      {sent ? (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-foreground" role="status">
            If an account exists for that email address, a password-reset link
            has been sent.
          </p>
          <Link
            href="/login"
            className="inline-flex min-h-10 w-full items-center justify-center border border-border px-5 text-xs font-semibold tracking-wide uppercase"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <form className="space-y-3 sm:space-y-4" onSubmit={onSubmit}>
          <label className="block space-y-1.5 text-sm sm:space-y-2">
            <span className="font-semibold tracking-wide uppercase">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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
            {pending ? "Sending…" : "Send reset link"}
          </button>
          <p className="text-center text-sm text-muted">
            <Link href="/login" className="text-brand hover:underline">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthCard>
  );
}
