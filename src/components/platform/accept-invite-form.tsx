"use client";

import { FormEvent, useState } from "react";

import { AuthCard } from "@/components/platform/auth-card";

export function AcceptInviteForm({
  email,
  fullName: initialFullName,
  inviteGeneration,
}: {
  email: string;
  fullName: string;
  inviteGeneration: number;
}) {
  const [fullName, setFullName] = useState(initialFullName);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        body: JSON.stringify({ password, fullName, inviteGeneration }),
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

  return (
    <AuthCard
      title="Activate your account"
      description="Set your password to finish activating your MA5 member access."
    >
      <form className="space-y-3 sm:space-y-4" onSubmit={onSubmit}>
        <label className="block space-y-1.5 text-sm sm:space-y-2">
          <span className="font-semibold tracking-wide uppercase">Email</span>
          <input
            type="email"
            value={email}
            readOnly
            className="min-h-10 w-full border border-border bg-background/60 px-3 text-muted outline-none sm:min-h-11"
          />
          <span className="block text-xs text-muted">
            This email is linked to your MA5 invitation and cannot be changed.
          </span>
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
