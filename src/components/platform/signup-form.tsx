"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { AuthCard } from "@/components/platform/auth-card";
import { DEMO_PERSONA_COOKIE } from "@/content/demo-persona";
import { isSupabasePublicConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

export function SignupForm() {
  const router = useRouter();
  const configured = isSupabasePublicConfigured();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function continueAsClient() {
    document.cookie = `${DEMO_PERSONA_COOKIE}=client; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
    router.push("/app");
    router.refresh();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured) {
      continueAsClient();
      return;
    }

    setPending(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setPending(false);
        return;
      }

      if (data.session) {
        router.push("/app");
        router.refresh();
        return;
      }

      setMessage("Check your email to confirm your account, then sign in.");
      setPending(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account");
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Join MA5"
      description="Create your member account, or continue with a preview profile."
    >
      <button
        type="button"
        onClick={continueAsClient}
        className="inline-flex min-h-11 w-full items-center justify-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase"
      >
        Continue as Demo Client
      </button>

      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        <label className="block space-y-2 text-sm">
          <span className="font-semibold tracking-wide uppercase">Full name</span>
          <input
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="min-h-11 w-full border border-border bg-background px-3 text-foreground outline-none focus:border-brand"
          />
        </label>
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
          <span className="font-semibold tracking-wide uppercase">Password</span>
          <input
            type="password"
            minLength={8}
            autoComplete="new-password"
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
        {message ? (
          <p className="text-sm text-muted" role="status">
            {message}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 w-full items-center justify-center border border-border px-5 text-xs font-semibold tracking-wide uppercase disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
