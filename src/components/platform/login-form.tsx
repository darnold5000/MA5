"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { AuthCard } from "@/components/platform/auth-card";
import { DEMO_PERSONA_COOKIE } from "@/content/demo-persona";
import { isSupabasePublicConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

function setDemoPersona(persona: "client" | "staff") {
  document.cookie = `${DEMO_PERSONA_COOKIE}=${persona}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/app";
  const configured = isSupabasePublicConfigured();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function continueAs(persona: "client" | "staff") {
    setDemoPersona(persona);
    // Hard navigation so the demo cookie is present on the next middleware check.
    window.location.assign(persona === "staff" ? "/admin" : "/app");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured) {
      continueAs("client");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setPending(false);
        return;
      }

      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Explore the MA5 client portal"
      description="Preview accounts use sample data. No payment is processed."
    >
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => continueAs("client")}
          className="inline-flex min-h-11 w-full items-center justify-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase"
        >
          Continue as Demo Client
        </button>
        <button
          type="button"
          onClick={() => continueAs("staff")}
          className="inline-flex min-h-11 w-full items-center justify-center border border-border px-5 text-xs font-semibold tracking-wide uppercase"
        >
          Continue as Staff Demo
        </button>
      </div>

      <div className="my-8 border-t border-border pt-6">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">
          Or sign in with your account
        </p>
        <form className="mt-4 space-y-4" onSubmit={onSubmit}>
          <label className="block space-y-2 text-sm">
            <span className="font-semibold tracking-wide uppercase">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-11 w-full border border-border bg-background px-3 text-foreground outline-none focus:border-brand"
            />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="font-semibold tracking-wide uppercase">
              Password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-11 w-full border border-border bg-background px-3 text-foreground outline-none focus:border-brand"
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
            className="inline-flex min-h-11 w-full items-center justify-center border border-border px-5 text-xs font-semibold tracking-wide uppercase disabled:opacity-50"
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
