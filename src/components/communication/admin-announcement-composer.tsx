"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useServerRefresh } from "@/hooks/use-server-refresh";

import type { AnnouncementAudienceType, AnnouncementPriority } from "@/features/messaging/types";

export function AdminAnnouncementComposer({
  estimatedAudience = 42,
}: {
  estimatedAudience?: number;
}) {
  const { router, refresh, isRefreshing } = useServerRefresh();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audienceType, setAudienceType] =
    useState<AnnouncementAudienceType>("all_active_clients");
  const [priority, setPriority] = useState<AnnouncementPriority>("normal");
  const [linkUrl, setLinkUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(publish: boolean) {
    setError(null);
    if (publish && estimatedAudience >= 20) {
      if (
        !window.confirm(
          `This announcement will be sent to ${estimatedAudience} clients. Publish now?`,
        )
      ) {
        return;
      }
    }
    startTransition(async () => {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          audienceType,
          priority,
          linkUrl: linkUrl || null,
          expiresAt: expiresAt
            ? new Date(expiresAt).toISOString()
            : null,
          publish,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setError(data?.error ?? "Could not save");
        return;
      }
      router.push("/admin/announcements");
      refresh();
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/admin/announcements"
          className="text-xs font-semibold tracking-wide text-muted uppercase hover:text-foreground"
        >
          ← Announcements
        </Link>
        <h1 className="mt-2 font-display text-3xl tracking-wide uppercase">
          New announcement
        </h1>
        <p className="mt-2 text-sm text-muted">
          One-way broadcast. Clients cannot reply.
        </p>
      </div>

      <div className="space-y-4 border border-border bg-surface p-5">
        <label className="block text-xs font-semibold tracking-wide uppercase">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full border border-border bg-background px-3 py-2 text-sm normal-case tracking-normal"
          />
        </label>
        <label className="block text-xs font-semibold tracking-wide uppercase">
          Message
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            className="mt-1 block w-full border border-border bg-background px-3 py-2 text-sm normal-case tracking-normal"
          />
        </label>
        <label className="block text-xs font-semibold tracking-wide uppercase">
          Audience
          <select
            value={audienceType}
            onChange={(e) =>
              setAudienceType(e.target.value as AnnouncementAudienceType)
            }
            className="mt-1 block w-full border border-border bg-background px-3 py-2 text-sm normal-case tracking-normal"
          >
            <option value="all_active_clients">All active clients</option>
            <option value="team">Team</option>
            <option value="program">Program</option>
            <option value="membership">Membership group</option>
            <option value="selected_clients">Selected clients</option>
          </select>
        </label>
        <label className="block text-xs font-semibold tracking-wide uppercase">
          Priority
          <select
            value={priority}
            onChange={(e) =>
              setPriority(e.target.value as AnnouncementPriority)
            }
            className="mt-1 block w-full border border-border bg-background px-3 py-2 text-sm normal-case tracking-normal"
          >
            <option value="normal">Normal</option>
            <option value="important">Important</option>
          </select>
        </label>
        <label className="block text-xs font-semibold tracking-wide uppercase">
          Optional link
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="/app/schedule"
            className="mt-1 block w-full border border-border bg-background px-3 py-2 text-sm normal-case tracking-normal"
          />
        </label>
        <label className="block text-xs font-semibold tracking-wide uppercase">
          Optional expiration
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="mt-1 block w-full border border-border bg-background px-3 py-2 text-sm normal-case tracking-normal"
          />
        </label>
        {error ? <p className="text-sm text-brand">{error}</p> : null}
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            disabled={pending || !title.trim() || !body.trim()}
            onClick={() => save(false)}
            className="inline-flex min-h-10 items-center border border-border px-4 text-[11px] font-semibold tracking-wide uppercase disabled:opacity-50"
          >
            Save draft
          </button>
          <button
            type="button"
            disabled={pending || !title.trim() || !body.trim()}
            onClick={() => save(true)}
            className="inline-flex min-h-10 items-center bg-brand px-4 text-[11px] font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50"
          >
            {pending ? "Working…" : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}
