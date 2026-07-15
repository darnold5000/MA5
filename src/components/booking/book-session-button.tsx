"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BookSessionButtonProps = {
  sessionId: string;
  disabled?: boolean;
};

export function BookSessionButton({
  sessionId,
  disabled,
}: BookSessionButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Booking failed");
        setPending(false);
        return;
      }
      const conf = data.booking?.confirmationNumber as string;
      router.push(
        `/app/bookings?booked=${encodeURIComponent(conf)}${data.demo ? "&demo=1" : ""}`,
      );
      router.refresh();
    } catch {
      setError("Booking failed");
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled || pending}
        onClick={onClick}
        className="inline-flex min-h-11 items-center justify-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50"
      >
        {pending ? "Booking…" : "Book spot"}
      </button>
      {error ? (
        <p className="text-xs text-brand" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
