"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { AuthCard } from "@/components/platform/auth-card";
import { DEMO_PERSONA_COOKIE } from "@/content/demo-persona";

function setDemoPersona(persona: "client" | "staff") {
  document.cookie = `${DEMO_PERSONA_COOKIE}=${persona}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/app";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function continueAs(persona: "client" | "staff") {
    setDemoPersona(persona);
    // Hard navigation so the demo cookie is present on the next middleware check.
    if (persona === "staff") {
      window.location.assign("/admin");
      return;
    }
    const dest =
      next.startsWith("/") && !next.startsWith("//") ? next : "/app";
    window.location.assign(dest);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Unable to sign in");
        setPending(false);
        return;
      }

      // Hard nav so Set-Cookie from the login response is used on the next page.
      window.location.assign(next.startsWith("/") ? next : "/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Client portal"
      description="Demo accounts use sample data. No payment is processed."
    >
      <div className="space-y-2 sm:space-y-3">
        <button
          type="button"
          onClick={() => continueAs("client")}
          className="inline-flex min-h-10 w-full items-center justify-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase sm:min-h-11"
        >
          Continue as Demo Client
        </button>
        <button
          type="button"
          onClick={() => continueAs("staff")}
          className="inline-flex min-h-10 w-full items-center justify-center border border-border px-5 text-xs font-semibold tracking-wide uppercase sm:min-h-11"
        >
          Continue as Operations Demo
        </button>
      </div>

      <div className="my-4 border-t border-border pt-4 sm:my-8 sm:pt-6">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">
          Or sign in with your account
        </p>
        <p className="mt-1 text-xs text-muted">
          Stay signed in until you sign out — including while browsing the
          website.
        </p>
        <form className="mt-3 space-y-3 sm:mt-4 sm:space-y-4" onSubmit={onSubmit}>
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
            <span className="font-semibold tracking-wide uppercase">
              Password
            </span>
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
            className="inline-flex min-h-10 w-full items-center justify-center border border-border px-5 text-xs font-semibold tracking-wide uppercase disabled:opacity-50 sm:min-h-11"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>

      <p className="text-sm text-muted">
        Need an account?{" "}
        <Link href="/signup" className="text-brand hover:underline">
          Create one
        </Link>
      </p>
    </AuthCard>
  );
}
