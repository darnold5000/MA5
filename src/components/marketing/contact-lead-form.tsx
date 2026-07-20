"use client";

import { useState } from "react";

export function ContactLeadForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        phone: phone || undefined,
        message: message || undefined,
        sourcePath: "/contact",
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    setPending(false);

    if (!res.ok) {
      setError(data.error ?? "Could not send message");
      return;
    }

    setSuccess(data.message ?? "Thanks — we will be in touch soon.");
    setName("");
    setEmail("");
    setPhone("");
    setMessage("");
  }

  return (
    <form onSubmit={onSubmit} className="mt-10 space-y-4 border border-border bg-surface p-6 sm:p-8">
      <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
        Send a message
      </p>
      <p className="text-sm text-muted">
        Tell us what you are looking for. We only link this to your visit after
        you submit the form.
      </p>

      <label className="block">
        <span className="text-xs font-semibold tracking-wide text-muted uppercase">
          Name
        </span>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1.5 w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none"
          autoComplete="name"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold tracking-wide text-muted uppercase">
          Email
        </span>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none"
          autoComplete="email"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold tracking-wide text-muted uppercase">
          Phone <span className="normal-case tracking-normal">(optional)</span>
        </span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1.5 w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none"
          autoComplete="tel"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold tracking-wide text-muted uppercase">
          Message <span className="normal-case tracking-normal">(optional)</span>
        </span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="mt-1.5 w-full resize-y border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none"
        />
      </label>

      {error ? <p className="text-sm text-brand">{error}</p> : null}
      {success ? <p className="text-sm text-foreground">{success}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-60"
      >
        {pending ? "Sending…" : "Submit"}
      </button>
    </form>
  );
}
