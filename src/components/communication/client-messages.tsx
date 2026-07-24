"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { refreshHubBadges, useServerRefresh } from "@/hooks/use-server-refresh";

import type {
  Announcement,
  Message,
  MessageThread,
} from "@/features/messaging/types";
import { cn } from "@/lib/utils";

type Tab = "messages" | "announcements";

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function ClientMessagesHome({
  threads,
  announcements,
  unreadMessages,
  unreadAnnouncements,
}: {
  threads: MessageThread[];
  announcements: Announcement[];
  unreadMessages: number;
  unreadAnnouncements: number;
}) {
  const [tab, setTab] = useState<Tab>("messages");

  const published = useMemo(
    () =>
      announcements.filter(
        (a) => a.status === "published" || a.status === "expired",
      ),
    [announcements],
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Inbox
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase">
          Messages
        </h1>
        <p className="mt-2 text-sm text-muted">
          Talk with your coach and read facility announcements.
        </p>
      </div>

      <div className="flex gap-1">
        {(
          [
            {
              id: "messages" as const,
              label: "Messages",
              badge: unreadMessages,
            },
            {
              id: "announcements" as const,
              label: "Announcements",
              badge: unreadAnnouncements,
            },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "relative min-h-10 border px-4 text-[11px] font-semibold tracking-wide uppercase",
              tab === t.id
                ? "border-brand bg-brand text-brand-foreground"
                : "border-border text-muted",
            )}
          >
            {t.label}
            {t.badge > 0 ? (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center bg-background px-1 text-[10px] text-brand">
                {t.badge > 9 ? "9+" : t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "messages" ? (
        <div className="divide-y divide-border border border-border bg-surface">
          {threads.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted">
              No conversations yet. Your coach will reach out here.
            </p>
          ) : (
            threads.map((t) => (
              <Link
                key={t.id}
                href={`/app/messages/${t.id}`}
                className="block px-5 py-4 transition hover:bg-background/60"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="inline-flex items-center gap-2 font-display text-lg tracking-wide uppercase">
                    {t.unreadCount > 0 ? (
                      <span className="size-1.5 rounded-full bg-brand" />
                    ) : null}
                    Coach
                  </p>
                  <p className="text-xs text-muted">
                    {relativeTime(t.lastMessageAt)}
                  </p>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted">
                  {t.lastMessagePreview}
                </p>
              </Link>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {published.map((a) => (
            <Link
              key={a.id}
              href="/app/announcements"
              className={cn(
                "block border px-5 py-4 transition hover:bg-surface/80",
                a.priority === "important"
                  ? "border-brand/40 bg-brand/5"
                  : "border-border bg-surface",
                !a.readAt && "ring-1 ring-brand/30",
              )}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="inline-flex items-center gap-2 font-display text-lg tracking-wide uppercase">
                  {!a.readAt ? (
                    <span className="size-1.5 rounded-full bg-brand" />
                  ) : null}
                  {a.priority === "important" ? (
                    <span className="border border-brand px-1.5 text-[10px] text-brand normal-case">
                      Important
                    </span>
                  ) : null}
                  {a.title}
                </p>
                <p className="text-xs text-muted">
                  {a.publishAt
                    ? new Date(a.publishAt).toLocaleDateString()
                    : ""}
                </p>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-muted">{a.body}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function ClientThreadView({
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
      const res = await fetch("/api/messages/send", {
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

  return (
    <div className="flex min-h-[70vh] flex-col">
      <div className="mb-4 border-b border-border pb-4">
        <Link
          href="/app/messages"
          className="text-xs font-semibold tracking-wide text-muted uppercase hover:text-foreground"
        >
          ← Messages
        </Link>
        <h1 className="mt-2 font-display text-2xl tracking-wide uppercase">
          Coach
        </h1>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pb-4">
        {messages.map((m) => {
          const mine = m.senderRole === "client";
          return (
            <div
              key={m.id}
              className={cn("flex", mine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-xl px-4 py-3 text-sm",
                  mine
                    ? "bg-brand text-brand-foreground"
                    : "border border-border bg-surface",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className="mt-2 text-[10px] opacity-70">
                  {new Date(m.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 border-t border-border bg-background pt-3 pb-20 lg:pb-[env(safe-area-inset-bottom)]">
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
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export function ClientAnnouncementsList({
  announcements,
}: {
  announcements: Announcement[];
}) {
  const { refresh, isRefreshing } = useServerRefresh();
  const published = announcements.filter(
    (a) => a.status === "published" || a.status === "expired",
  );

  useEffect(() => {
    for (const a of published) {
      if (!a.readAt) {
        void fetch(`/api/announcements/${a.id}/mark-read`, {
          method: "POST",
        }).then(() => refreshHubBadges());
      }
    }
    // Mark on first view of list — intentional once per mount for unread
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/app/messages"
          className="text-xs font-semibold tracking-wide text-muted uppercase hover:text-foreground"
        >
          ← Messages
        </Link>
        <h1 className="mt-2 font-display text-3xl tracking-wide uppercase">
          Announcements
        </h1>
      </div>
      <div className="space-y-3">
        {published.map((a) => (
          <article
            key={a.id}
            className={cn(
              "border px-5 py-4",
              a.priority === "important"
                ? "border-brand/40 bg-brand/5"
                : "border-border bg-surface",
              a.status === "expired" && "opacity-60",
            )}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-display text-lg tracking-wide uppercase">
                {a.title}
              </p>
              <p className="text-xs text-muted">
                {a.publishAt
                  ? new Date(a.publishAt).toLocaleDateString()
                  : ""}
              </p>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm">{a.body}</p>
            {a.linkUrl ? (
              <Link
                href={a.linkUrl}
                className="mt-3 inline-flex text-xs font-semibold tracking-wide text-brand uppercase hover:underline"
              >
                Open link →
              </Link>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
