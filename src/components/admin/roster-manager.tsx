"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { RosterEntry, StaffClient } from "@/features/admin/ops-store";
import type { SessionItem } from "@/features/scheduling/fallback-data";
import { paymentStatusLabel } from "@/features/booking/labels";
import {
  formatMoney,
  formatSessionWhen,
} from "@/features/scheduling/format";

type AdminRosterManagerProps = {
  sessions: SessionItem[];
  roster: RosterEntry[];
  clients: StaffClient[];
};

export function AdminRosterManager({
  sessions,
  roster,
  clients,
}: AdminRosterManagerProps) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState(sessions[0]?.id ?? "");
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [walkInName, setWalkInName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeSessions = useMemo(
    () => sessions.filter((s) => s.status === "published" || s.status === "full"),
    [sessions],
  );

  const filtered = useMemo(
    () =>
      roster
        .filter((r) => (sessionId ? r.sessionId === sessionId : true))
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [roster, sessionId],
  );

  async function addPerson() {
    setPending(true);
    setError(null);
    const selected = clients.find((c) => c.id === clientId);
    const clientName = walkInName.trim() || selected?.fullName;
    if (!clientName || !sessionId) {
      setError("Choose a session and a person");
      setPending(false);
      return;
    }
    const res = await fetch("/api/admin/roster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        clientName,
        clientEmail: selected?.email,
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not add person");
      return;
    }
    setWalkInName("");
    router.refresh();
  }

  async function setStatus(bookingId: string, status: string) {
    setPending(true);
    setError(null);
    const res = await fetch("/api/admin/roster", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, status }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Update failed");
      return;
    }
    router.refresh();
  }

  async function removePerson(bookingId: string) {
    setPending(true);
    setError(null);
    const res = await fetch("/api/admin/roster", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Remove failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 border border-border bg-surface p-5 sm:grid-cols-2">
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="text-xs font-semibold tracking-wide uppercase">
            Class / session
          </span>
          <select
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="min-h-11 w-full border border-border bg-background px-3"
          >
            {activeSessions.map((s) => (
              <option key={s.id} value={s.id}>
                {formatSessionWhen(s.startsAt)} — {s.title} (
                {s.bookedCount}/{s.capacity})
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs font-semibold tracking-wide uppercase">
            Existing client
          </span>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="min-h-11 w-full border border-border bg-background px-3"
          >
            {clients
              .filter((c) => c.status === "active")
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                </option>
              ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs font-semibold tracking-wide uppercase">
            Or walk-in name
          </span>
          <input
            value={walkInName}
            onChange={(e) => setWalkInName(e.target.value)}
            placeholder="Optional walk-in"
            className="min-h-11 w-full border border-border bg-background px-3"
          />
        </label>
        <button
          type="button"
          disabled={pending}
          onClick={addPerson}
          className="inline-flex min-h-11 items-center justify-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase sm:col-span-2"
        >
          {pending ? "Adding…" : "Add to class"}
        </button>
      </div>

      {error ? (
        <p className="text-sm text-brand" role="alert">
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted">No people on this roster yet.</p>
        ) : (
          filtered.map((entry) => (
            <article
              key={entry.id}
              className="border border-border bg-surface p-5"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="font-display text-xl tracking-wide uppercase">
                    {entry.clientName}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {entry.sessionTitle} · {formatSessionWhen(entry.startsAt)}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {entry.status.replaceAll("_", " ")} ·{" "}
                    {paymentStatusLabel(
                      entry.amountCents === 0
                        ? "included"
                        : entry.paymentStatus,
                    )}
                    {entry.amountCents > 0
                      ? ` · ${formatMoney(entry.amountCents)}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setStatus(entry.id, "attended")}
                    className="inline-flex min-h-10 items-center border border-border px-3 text-[11px] font-semibold tracking-wide uppercase"
                  >
                    Check in
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setStatus(entry.id, "no_show")}
                    className="inline-flex min-h-10 items-center border border-border px-3 text-[11px] font-semibold tracking-wide uppercase"
                  >
                    No show
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setStatus(entry.id, "cancelled")}
                    className="inline-flex min-h-10 items-center border border-border px-3 text-[11px] font-semibold tracking-wide uppercase"
                  >
                    Cancel spot
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => removePerson(entry.id)}
                    className="inline-flex min-h-10 items-center border border-border px-3 text-[11px] font-semibold tracking-wide uppercase"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
