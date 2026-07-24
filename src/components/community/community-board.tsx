"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import type { CommunityPost } from "@/features/community/types";
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
      className={cn("h-4 w-4", className)}
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function Composer({
  value,
  onChange,
  onSubmit,
  onCancel,
  pending,
  placeholder,
  submitLabel,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  pending: boolean;
  placeholder: string;
  submitLabel: string;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder={placeholder}
          className="min-h-12 flex-1 border border-border bg-background px-3 py-2 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
            if (e.key === "Escape" && onCancel) {
              e.preventDefault();
              onCancel();
            }
          }}
        />
        <button
          type="button"
          disabled={pending || !value.trim()}
          onClick={onSubmit}
          className="inline-flex min-h-12 items-center self-end bg-brand px-4 text-[11px] font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50"
        >
          {pending ? "…" : submitLabel}
        </button>
      </div>
      {onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          className="text-[10px] font-semibold tracking-wide text-muted uppercase hover:text-foreground"
        >
          Cancel
        </button>
      ) : null}
    </div>
  );
}

export function CommunityBoard({
  posts: initialPosts,
  canDelete,
  title = "Community board",
  description,
}: {
  posts: CommunityPost[];
  canDelete: boolean;
  title?: string;
  description?: string;
}) {
  const [boardPosts, setBoardPosts] = useState(initialPosts);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBoardPosts(initialPosts);
  }, [initialPosts]);

  async function reloadFromApi() {
    const res = await fetch("/api/community", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { posts?: CommunityPost[] };
    if (Array.isArray(data.posts)) {
      setBoardPosts(data.posts);
    }
  }

  function postMessage(body: string, parentId: string | null) {
    if (!body.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: body.trim(),
          parentId,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Could not post");
        return;
      }
      if (parentId) {
        setReplyDraft("");
        setReplyTo(null);
      } else {
        setDraft("");
      }
      await reloadFromApi();
    });
  }

  function remove(postId: string) {
    if (!canDelete) return;
    if (!window.confirm("Delete this message?")) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/community", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Could not delete");
        return;
      }
      await reloadFromApi();
    });
  }

  function startReply(postId: string) {
    setReplyTo(postId);
    setReplyDraft("");
    setError(null);
  }

  function cancelReply() {
    setReplyTo(null);
    setReplyDraft("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-wide uppercase">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p>
        ) : null}
      </div>

      <section className="border border-border bg-surface p-4 sm:p-5">
        {error && !replyTo ? (
          <p className="mb-2 text-sm text-brand" role="alert">
            {error}
          </p>
        ) : null}
        <Composer
          value={draft}
          onChange={setDraft}
          onSubmit={() => postMessage(draft, null)}
          pending={pending}
          placeholder="Leave a message…"
          submitLabel="Post"
        />
      </section>

      <div className="space-y-4">
        {boardPosts.length === 0 ? (
          <p className="text-sm text-muted">No messages yet — start the chat.</p>
        ) : null}
        {boardPosts.map((post) => (
          <article
            key={post.id}
            className="border border-border bg-surface px-4 py-4 sm:px-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{post.authorName}</p>
                <p className="text-[11px] text-muted">
                  {relativeTime(post.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    replyTo === post.id ? cancelReply() : startReply(post.id)
                  }
                  className="px-2 py-1 text-[10px] font-semibold tracking-wide text-muted uppercase hover:text-foreground"
                >
                  {replyTo === post.id ? "Close" : "Reply"}
                </button>
                {canDelete ? (
                  <button
                    type="button"
                    onClick={() => remove(post.id)}
                    disabled={pending}
                    aria-label="Delete message"
                    title="Delete"
                    className="inline-flex h-8 w-8 items-center justify-center text-muted transition hover:text-brand disabled:opacity-50"
                  >
                    <TrashIcon />
                  </button>
                ) : null}
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm">
              {post.body}
            </p>

            {post.replies.length > 0 ? (
              <ul className="mt-4 space-y-3 border-l border-border pl-4">
                {post.replies.map((reply) => (
                  <li key={reply.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {reply.authorName}
                        </p>
                        <p className="text-[11px] text-muted">
                          {relativeTime(reply.createdAt)}
                        </p>
                      </div>
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => remove(reply.id)}
                          disabled={pending}
                          aria-label="Delete reply"
                          title="Delete"
                          className="inline-flex h-8 w-8 items-center justify-center text-muted transition hover:text-brand disabled:opacity-50"
                        >
                          <TrashIcon />
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                      {reply.body}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}

            {replyTo === post.id ? (
              <div className="mt-4 border-l border-brand/40 pl-4">
                {error ? (
                  <p className="mb-2 text-sm text-brand" role="alert">
                    {error}
                  </p>
                ) : null}
                <Composer
                  value={replyDraft}
                  onChange={setReplyDraft}
                  onSubmit={() => postMessage(replyDraft, post.id)}
                  onCancel={cancelReply}
                  pending={pending}
                  placeholder={`Reply to ${post.authorName}…`}
                  submitLabel="Reply"
                  autoFocus
                />
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
