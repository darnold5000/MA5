"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { StaffClient } from "@/features/admin/ops-store";

type AdminClientsManagerProps = {
  clients: StaffClient[];
};

export function AdminClientsManager({ clients }: AdminClientsManagerProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  async function addClient() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, phone, notes }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not add client");
      return;
    }
    setFullName("");
    setEmail("");
    setPhone("");
    setNotes("");
    router.refresh();
  }

  async function setStatus(clientId: string, status: "active" | "inactive") {
    setPending(true);
    setError(null);
    const res = await fetch("/api/admin/clients", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, status }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Update failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 border border-border bg-surface p-5 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-xs font-semibold tracking-wide uppercase">
            Full name
          </span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="min-h-11 w-full border border-border bg-background px-3"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs font-semibold tracking-wide uppercase">
            Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-11 w-full border border-border bg-background px-3"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs font-semibold tracking-wide uppercase">
            Phone
          </span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="min-h-11 w-full border border-border bg-background px-3"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs font-semibold tracking-wide uppercase">
            Notes
          </span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-11 w-full border border-border bg-background px-3"
          />
        </label>
        <button
          type="button"
          disabled={pending || !fullName || !email}
          onClick={addClient}
          className="inline-flex min-h-11 items-center justify-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50 sm:col-span-2"
        >
          {pending ? "Saving…" : "Add client"}
        </button>
      </div>

      {error ? (
        <p className="text-sm text-brand" role="alert">
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        {clients.map((client) => (
          <article
            key={client.id}
            className="flex flex-col gap-3 border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h3 className="font-display text-xl tracking-wide uppercase">
                {client.fullName}
              </h3>
              <p className="mt-1 text-sm text-muted">
                {client.email}
                {client.phone ? ` · ${client.phone}` : ""}
              </p>
              <p className="mt-1 text-sm text-muted">
                {client.status}
                {client.notes ? ` · ${client.notes}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {client.status === "active" ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setStatus(client.id, "inactive")}
                  className="inline-flex min-h-10 items-center border border-border px-3 text-[11px] font-semibold tracking-wide uppercase"
                >
                  Deactivate
                </button>
              ) : (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setStatus(client.id, "active")}
                  className="inline-flex min-h-10 items-center border border-border px-3 text-[11px] font-semibold tracking-wide uppercase"
                >
                  Reactivate
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
