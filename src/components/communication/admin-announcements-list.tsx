"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useServerRefresh } from "@/hooks/use-server-refresh";

import type { Announcement, AnnouncementStatus } from "@/features/messaging/types";
import { cn } from "@/lib/utils";

const STATUS_TABS: { id: AnnouncementStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Drafts" },
  { id: "published", label: "Published" },
  { id: "expired", label: "Expired" },
];

export function AdminAnnouncementsList({
  announcements,
}: {
  announcements: Announcement[];
}) {
  const { router, refresh, isRefreshing } = useServerRefresh();
  const [tab, setTab] = useState<AnnouncementStatus | "all">("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (tab === "all") return announcements;
    return announcements.filter((a) => a.status === tab);
  }, [announcements, tab]);

  function publish(id: string, estimatedCount: number) {
    if (
      estimatedCount >= 20 &&
      !window.confirm(
        `This announcement will be sent to about ${estimatedCount} clients. Publish now?`,
      )
    ) {
      return;
    }
    setPendingId(id);
    startTransition(async () => {
      await fetch(`/api/admin/announcements/${id}/publish`, { method: "POST" });
      setPendingId(null);
      refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
            Communication
          </p>
          <h1 className="mt-1 font-display text-3xl tracking-wide uppercase">
            Announcements
          </h1>
          <p className="mt-2 text-sm text-muted">
            One-way updates to clients. No replies in v1.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/messages"
            className="inline-flex min-h-10 items-center border border-border px-3 text-[11px] font-semibold tracking-wide uppercase"
          >
            Messages
          </Link>
          <Link
            href="/admin/announcements/new"
            className="inline-flex min-h-10 items-center bg-brand px-3 text-[11px] font-semibold tracking-wide text-brand-foreground uppercase"
          >
            New announcement
          </Link>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "min-h-10 shrink-0 border px-3 text-[11px] font-semibold tracking-wide uppercase",
              tab === t.id
                ? "border-brand bg-brand text-brand-foreground"
                : "border-border text-muted",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="divide-y divide-border border border-border bg-surface">
        {filtered.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted">No announcements here.</p>
        ) : (
          filtered.map((a) => (
            <article key={a.id} className="px-5 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="inline-flex items-center gap-2 font-display text-lg tracking-wide uppercase">
                  {a.priority === "important" ? (
                    <span className="border border-brand px-1.5 py-0.5 text-[10px] font-semibold text-brand normal-case tracking-wide">
                      Important
                    </span>
                  ) : null}
                  {a.title}
                </p>
                <p className="text-xs tracking-wide text-muted uppercase">
                  {a.status}
                </p>
              </div>
              <p className="mt-1 text-sm text-muted">
                {a.audienceLabel}
                {a.publishAt
                  ? ` · ${new Date(a.publishAt).toLocaleDateString()}`
                  : ""}
              </p>
              <p className="mt-2 line-clamp-2 text-sm">{a.body}</p>
              <p className="mt-2 text-xs text-muted">
                Delivered {a.deliveredCount} · Read {a.readCount}
              </p>
              {a.status === "draft" ? (
                <button
                  type="button"
                  disabled={pending && pendingId === a.id}
                  onClick={() => publish(a.id, a.deliveredCount || 42)}
                  className="mt-3 inline-flex min-h-10 items-center border border-border px-3 text-[11px] font-semibold tracking-wide uppercase"
                >
                  {pending && pendingId === a.id ? "Publishing…" : "Publish"}
                </button>
              ) : null}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
