"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

type GrowthFiltersProps = {
  sources: string[];
  campaigns: string[];
  showStatus?: boolean;
};

export function GrowthFilters({
  sources,
  campaigns,
  showStatus = false,
}: GrowthFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const range = searchParams.get("range") ?? "30d";
  const source = searchParams.get("source") ?? "";
  const campaign = searchParams.get("campaign") ?? "";
  const status = searchParams.get("status") ?? "";
  const [customFrom, setCustomFrom] = useState(
    searchParams.get("from") ?? "",
  );
  const [customTo, setCustomTo] = useState(searchParams.get("to") ?? "");

  function push(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    const q = params.toString();
    startTransition(() => {
      router.push(q ? `${pathname}?${q}` : pathname);
    });
  }

  return (
    <div
      className={`flex flex-wrap items-end gap-3 ${pending ? "opacity-70" : ""}`}
    >
      <label className="text-xs">
        <span className="mb-1 block font-semibold tracking-wide text-muted uppercase">
          Date range
        </span>
        <select
          value={range}
          onChange={(e) => {
            const value = e.target.value;
            if (value === "custom") {
              push({
                range: "custom",
                from: customFrom || new Date().toISOString().slice(0, 10),
                to: customTo || new Date().toISOString().slice(0, 10),
              });
              return;
            }
            push({ range: value, from: undefined, to: undefined });
          }}
          className="min-h-11 border border-border bg-surface px-3 text-sm"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="month">This month</option>
          <option value="custom">Custom range</option>
        </select>
      </label>

      {range === "custom" ? (
        <>
          <label className="text-xs">
            <span className="mb-1 block font-semibold tracking-wide text-muted uppercase">
              From
            </span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              onBlur={() =>
                push({
                  range: "custom",
                  from: customFrom || undefined,
                  to: customTo || undefined,
                })
              }
              className="min-h-11 border border-border bg-surface px-3 text-sm"
            />
          </label>
          <label className="text-xs">
            <span className="mb-1 block font-semibold tracking-wide text-muted uppercase">
              To
            </span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              onBlur={() =>
                push({
                  range: "custom",
                  from: customFrom || undefined,
                  to: customTo || undefined,
                })
              }
              className="min-h-11 border border-border bg-surface px-3 text-sm"
            />
          </label>
        </>
      ) : null}

      <label className="text-xs">
        <span className="mb-1 block font-semibold tracking-wide text-muted uppercase">
          Source
        </span>
        <select
          value={source}
          onChange={(e) => push({ source: e.target.value || undefined })}
          className="min-h-11 border border-border bg-surface px-3 text-sm"
        >
          <option value="">All sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs">
        <span className="mb-1 block font-semibold tracking-wide text-muted uppercase">
          Campaign
        </span>
        <select
          value={campaign}
          onChange={(e) => push({ campaign: e.target.value || undefined })}
          className="min-h-11 border border-border bg-surface px-3 text-sm"
        >
          <option value="">All campaigns</option>
          {campaigns.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      {showStatus ? (
        <label className="text-xs">
          <span className="mb-1 block font-semibold tracking-wide text-muted uppercase">
            Status
          </span>
          <select
            value={status}
            onChange={(e) => push({ status: e.target.value || undefined })}
            className="min-h-11 border border-border bg-surface px-3 text-sm"
          >
            <option value="">All statuses</option>
            <option value="new">new</option>
            <option value="contacted">contacted</option>
            <option value="qualified">qualified</option>
            <option value="converted">converted</option>
            <option value="closed">closed</option>
          </select>
        </label>
      ) : null}
    </div>
  );
}
