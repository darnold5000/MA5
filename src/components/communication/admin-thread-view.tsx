"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { refreshHubBadges, useServerRefresh } from "@/hooks/use-server-refresh";

import type { Message, MessageThread } from "@/features/messaging/types";
import { cn } from "@/lib/utils";

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-3.5 w-3.5", className)}
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function AdminThreadView({
  thread,
  messages,
}: {
  thread: MessageThread;
  messages: Message[];
}) {
  const { refresh, isRefreshing } = useServerRefresh();
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    void fetch("/api/messages/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId: thread.id }),
    }).then(() => refreshHubBadges());
  }, [thread.id, messages.length]);

  function send() {
    if (!draft.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: thread.id, body: draft.trim() }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Send failed");
        return;
      }
      setDraft("");
      refresh();
    });
  }

  function removeMessage(messageId: string) {
    if (!window.confirm("Delete this message?")) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/messages/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, threadId: thread.id }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Delete failed");
        return;
      }
      refresh();
    });
  }

  return (
    <div className="flex min-h-[70vh] flex-col">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <Link
            href="/admin/messages"
            className="text-xs font-semibold tracking-wide text-muted uppercase hover:text-foreground"
          >
            ← Messages
          </Link>
          <h1 className="mt-2 font-display text-2xl tracking-wide uppercase">
            {thread.clientName}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {[thread.membershipLabel, thread.programLabel]
              .filter(Boolean)
              .join(" · ") || "Client"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/clients"
            className="inline-flex min-h-10 items-center border border-border px-3 text-[11px] font-semibold tracking-wide uppercase"
          >
            View client
          </Link>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pb-4">
        {messages.map((m) => {
          const staff = m.senderRole !== "client";
          return (
            <div
              key={m.id}
              className={cn("flex", staff ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "relative max-w-[85%] rounded-xl px-4 py-3 text-sm",
                  staff
                    ? "bg-brand text-brand-foreground"
                    : "border border-border bg-surface",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[10px] font-semibold tracking-wide uppercase opacity-80">
                    {m.senderName}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeMessage(m.id)}
                    disabled={pending}
                    aria-label="Delete message"
                    title="Delete"
                    className={cn(
                      "inline-flex h-6 w-6 shrink-0 items-center justify-center opacity-70 transition hover:opacity-100 disabled:opacity-40",
                      staff ? "text-brand-foreground" : "text-muted",
                    )}
                  >
                    <TrashIcon />
                  </button>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words">{m.body}</p>
                <p className="mt-2 text-[10px] opacity-70">
                  {new Date(m.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 border-t border-border bg-background pt-3 pb-[env(safe-area-inset-bottom)]">
        {error ? <p className="mb-2 text-sm text-brand">{error}</p> : null}
        <div className="flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="Reply…"
            className="min-h-12 flex-1 border border-border bg-surface px-3 py-2 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button
            type="button"
            disabled={pending || !draft.trim()}
            onClick={send}
            className="inline-flex min-h-12 items-center self-end bg-brand px-4 text-[11px] font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50"
          >
            {pending ? "…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
