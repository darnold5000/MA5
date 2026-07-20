"use client";

import { useEffect, useState } from "react";

import {
  BOOKING_REQUEST_SERVICES,
  type BookingRequestService,
  isBookingRequestService,
} from "@/content/booking-request";

type BookingRequestFormProps = {
  initialService?: string | null;
  sourcePath?: string;
};

export function BookingRequestForm({
  initialService = null,
  sourcePath = "/book",
}: BookingRequestFormProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState<BookingRequestService>("consultation");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (initialService && isBookingRequestService(initialService)) {
      setService(initialService);
    }
  }, [initialService]);

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
        service,
        intent: "booking",
        sourcePath,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    setPending(false);

    if (!res.ok) {
      setError(data.error ?? "Could not send request");
      return;
    }

    setSuccess(
      data.message ??
        "Thanks — your request was sent. Mike will follow up by email or phone to schedule.",
    );
    setName("");
    setEmail("");
    setPhone("");
    setMessage("");
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 border border-border bg-surface p-6 sm:p-8"
    >
      <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
        Request a booking
      </p>
      <p className="text-sm text-muted">
        Tell us what you are interested in and how to reach you. We will follow
        up by email or phone to confirm a time — no account required.
      </p>

      <label className="block">
        <span className="text-xs font-semibold tracking-wide text-muted uppercase">
          Service
        </span>
        <select
          required
          value={service}
          onChange={(e) =>
            setService(e.target.value as BookingRequestService)
          }
          className="ma5-select mt-1.5 w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none"
        >
          {BOOKING_REQUEST_SERVICES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

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
          Notes{" "}
          <span className="normal-case tracking-normal">
            (goals, preferred days, etc.)
          </span>
        </span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="mt-1.5 w-full resize-y border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none"
          placeholder="Example: weekday mornings work best."
        />
      </label>

      {error ? (
        <p className="text-sm text-brand" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm text-foreground" role="status">
          {success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-60"
      >
        {pending ? "Sending…" : "Submit request"}
      </button>
    </form>
  );
}
