"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useServerRefresh } from "@/hooks/use-server-refresh";

import type { MessageThread, ThreadListFilter } from "@/features/messaging/types";
import { cn } from "@/lib/utils";

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

const FILTERS: { id: ThreadListFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "needs_reply", label: "Needs reply" },
];

export function AdminMessagesInbox({
  threads,
  clients,
  activeThreadId,
}: {
  threads: MessageThread[];
  clients: { id: string; name: string }[];
  activeThreadId?: string;
}) {
  const { router, refresh, isRefreshing } = useServerRefresh();
  const [filter, setFilter] = useState<ThreadListFilter>("all");
  const [q, setQ] = useState("");
  const [composing, setComposing] = useState(false);
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = threads;
    if (filter === "unread") list = list.filter((t) => t.unreadCount > 0);
    if (filter === "needs_reply") {
      list = list.filter(
        (t) => t.lastSenderRole === "client" && t.unreadCount > 0,
      );
    }
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.clientName.toLowerCase().includes(needle) ||
          (t.lastMessagePreview ?? "").toLowerCase().includes(needle),
      );
    }
    return list;
  }, [threads, filter, q]);

  function startThread() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/messages/thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, body }),
      });
      const data = (await res.json().catch(() => null)) as {
        threadId?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.threadId) {
        setError(data?.error ?? "Could not start conversation");
        return;
      }
      setComposing(false);
      setBody("");
      router.push(`/admin/messages/${data.threadId}`);
      refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-wide uppercase">
            Messages
          </h1>
          <p className="mt-2 text-sm text-muted">
            Direct coach ↔ client conversations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/announcements"
            className="inline-flex min-h-10 items-center border border-border px-3 text-[11px] font-semibold tracking-wide uppercase"
          >
            Announcements
          </Link>
          <button
            type="button"
            onClick={() => setComposing((v) => !v)}
            className="inline-flex min-h-10 items-center bg-brand px-3 text-[11px] font-semibold tracking-wide text-brand-foreground uppercase"
          >
            New message
          </button>
        </div>
      </div>

      {composing ? (
        <div className="space-y-3 border border-border bg-surface p-4">
          <label className="block text-xs font-semibold tracking-wide uppercase">
            Client
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="mt-1 block w-full border border-border bg-background px-3 py-2 text-sm normal-case tracking-normal"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold tracking-wide uppercase">
            Message
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              className="mt-1 block w-full border border-border bg-background px-3 py-2 text-sm normal-case tracking-normal"
              placeholder="Write your message…"
            />
          </label>
          {error ? <p className="text-sm text-brand">{error}</p> : null}
          <button
            type="button"
            disabled={pending || !body.trim() || !clientId}
            onClick={startThread}
            className="inline-flex min-h-10 items-center bg-brand px-4 text-[11px] font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50"
          >
            {pending ? "Sending…" : "Send"}
          </button>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search clients…"
          className="min-h-10 flex-1 border border-border bg-surface px-3 text-sm"
        />
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "min-h-10 border px-3 text-[11px] font-semibold tracking-wide uppercase",
                filter === f.id
                  ? "border-brand bg-brand text-brand-foreground"
                  : "border-border text-muted",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-border px-6 py-12 text-center">
          <p className="font-display text-xl tracking-wide uppercase">
            No client conversations yet
          </p>
          <p className="mt-2 text-sm text-muted">
            Start a message to reach a client directly.
          </p>
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="mt-4 inline-flex min-h-10 items-center bg-brand px-4 text-[11px] font-semibold tracking-wide text-brand-foreground uppercase"
          >
            Start a message
          </button>
        </div>
      ) : (
        <div className="divide-y divide-border border border-border bg-surface">
          {filtered.map((t) => {
            const active = t.id === activeThreadId;
            return (
              <Link
                key={t.id}
                href={`/admin/messages/${t.id}`}
                className={cn(
                  "block px-5 py-4 transition hover:bg-background/60",
                  active && "bg-brand/5",
                )}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="inline-flex items-center gap-2 font-display text-lg tracking-wide uppercase">
                    {t.unreadCount > 0 ? (
                      <span
                        className="size-1.5 rounded-full bg-brand"
                        aria-label={`${t.unreadCount} unread`}
                      />
                    ) : null}
                    {t.clientName}
                    {t.unreadCount > 0 ? (
                      <span className="text-xs font-semibold text-brand normal-case tracking-normal">
                        {t.unreadCount > 9 ? "9+" : t.unreadCount}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted">
                    {relativeTime(t.lastMessageAt)}
                  </p>
                </div>
                <p className="mt-1 line-clamp-1 text-sm text-muted">
                  {t.lastMessagePreview}
                </p>
                {(t.membershipLabel || t.programLabel) && (
                  <p className="mt-1 text-[11px] tracking-wide text-muted uppercase">
                    {[t.membershipLabel, t.programLabel]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
