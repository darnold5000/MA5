"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { AuthCard } from "@/components/platform/auth-card";

export function LoginForm() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          next: nextParam,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        redirectTo?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "Unable to sign in");
        setPending(false);
        return;
      }

      const dest =
        data.redirectTo &&
        data.redirectTo.startsWith("/") &&
        !data.redirectTo.startsWith("//")
          ? data.redirectTo
          : "/app";
      window.location.assign(dest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Sign in"
      description="Use your MA5 account to open the client hub or Operations."
    >
      <form className="space-y-3 sm:space-y-4" onSubmit={onSubmit}>
        <label className="block space-y-1.5 text-sm sm:space-y-2">
          <span className="font-semibold tracking-wide uppercase">Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-10 w-full border border-border bg-background px-3 text-foreground outline-none focus:border-brand sm:min-h-11"
          />
        </label>
        <label className="block space-y-1.5 text-sm sm:space-y-2">
          <span className="font-semibold tracking-wide uppercase">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-10 w-full border border-border bg-background px-3 text-foreground outline-none focus:border-brand sm:min-h-11"
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
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Need an account?{" "}
        <Link href="/signup" className="text-brand hover:underline">
          Create one
        </Link>
      </p>
    </AuthCard>
  );
}
