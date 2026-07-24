"use client";

import { useServerRefresh } from "@/hooks/use-server-refresh";
import { useRef, useState } from "react";

import { formatCompactMoney } from "@/features/analytics/format";

type ImportSummary = {
  parsed: number;
  imported: number;
  updated: number;
  skipped: number;
  grossCents: number;
  feeCents: number;
  netCents: number;
  matchedClients: number;
  skipReasons?: { row: number; reason: string }[];
  error?: string;
};

export function PaymentImportPanel() {
  const { router, refresh, isRefreshing } = useServerRefresh();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [importBefore, setImportBefore] = useState("");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Choose an Excel file first");
      return;
    }

    setPending(true);
    setError(null);
    setSummary(null);

    const form = new FormData();
    form.append("file", file);
    if (importBefore.trim()) {
      form.append("importBefore", importBefore);
    }

    const res = await fetch("/api/admin/payments/import", {
      method: "POST",
      body: form,
    });
    const data = (await res.json().catch(() => ({}))) as ImportSummary & {
      ok?: boolean;
      error?: string;
    };
    setPending(false);

    if (!res.ok) {
      setError(data.error ?? "Import failed");
      return;
    }

    setSummary(data);
    refresh();
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <section className="space-y-4 border border-border bg-surface p-5 sm:p-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Historical data
        </p>
        <h2 className="mt-1 font-display text-2xl tracking-wide uppercase">
          Import Mindbody payments
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Upload the Mindbody{" "}
          <span className="text-foreground">All Payment Transactions</span>{" "}
          export (.xlsx). We use per-row transaction amount and fees — not the
          repeated payout batch totals in columns A–C. Re-uploading the same file
          is safe (deduped by sale order).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5 text-sm">
          <span className="text-xs font-semibold tracking-wide uppercase">
            Excel file
          </span>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="block w-full text-sm text-muted file:mr-3 file:border file:border-border file:bg-background file:px-3 file:py-2 file:text-xs file:font-semibold file:tracking-wide file:uppercase"
          />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="text-xs font-semibold tracking-wide uppercase">
            Import only before (optional)
          </span>
          <input
            type="date"
            value={importBefore}
            onChange={(e) => setImportBefore(e.target.value)}
            className="min-h-11 w-full border border-border bg-background px-3"
          />
          <span className="text-xs text-muted">
            Use your Stripe go-live date to avoid overlap with live payments.
          </span>
        </label>
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={() => void onSubmit()}
        className="inline-flex min-h-11 items-center justify-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50"
      >
        {pending ? "Importing…" : "Import payments"}
      </button>

      {error ? (
        <p className="text-sm text-brand" role="alert">
          {error}
        </p>
      ) : null}

      {summary ? (
        <div className="border border-border bg-background p-4 text-sm">
          <p className="font-semibold text-foreground">Import complete</p>
          <ul className="mt-2 space-y-1 text-muted">
            <li>
              Parsed {summary.parsed} rows · imported {summary.imported} ·
              updated {summary.updated} · skipped {summary.skipped}
            </li>
            <li>
              Gross {formatCompactMoney(summary.grossCents)} · fees{" "}
              {formatCompactMoney(summary.feeCents)} · net{" "}
              {formatCompactMoney(summary.netCents)}
            </li>
            <li>Matched {summary.matchedClients} rows to existing MA5 profiles</li>
          </ul>
          {summary.skipReasons && summary.skipReasons.length > 0 ? (
            <ul className="mt-3 space-y-1 text-xs text-muted">
              {summary.skipReasons.map((item, i) => (
                <li key={`${item.row}-${i}`}>
                  {item.row > 0 ? `Row ${item.row}: ` : ""}
                  {item.reason}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
