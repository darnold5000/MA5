"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type TabId = "inbox" | "conversations" | "notifications";

type ItemKind = "conversation" | "notification";

type FeedItem = {
  id: string;
  kind: ItemKind;
  /** notification subtype for label */
  topic?: "booking" | "payment" | "reminder" | "program" | "facility";
  title: string;
  body: string;
  when: string;
  href?: string;
  unread?: boolean;
};

const TABS: { id: TabId; label: string }[] = [
  { id: "inbox", label: "Inbox" },
  { id: "conversations", label: "Conversations" },
  { id: "notifications", label: "Notifications" },
];

const INITIAL: FeedItem[] = [
  {
    id: "c1",
    kind: "conversation",
    title: "Coach Robert",
    body: "Great work yesterday — let’s keep Thursday on the schedule.",
    when: "Yesterday",
    unread: true,
  },
  {
    id: "n1",
    kind: "notification",
    topic: "facility",
    title: "Recovery Room closed Friday",
    body: "Sauna and recovery room unavailable this Friday for maintenance.",
    when: "2 hours ago",
    unread: true,
  },
  {
    id: "n2",
    kind: "notification",
    topic: "booking",
    title: "Booking confirmed",
    body: "Small Group Training · Friday 2:00 PM",
    when: "Monday",
    href: "/app/bookings",
    unread: false,
  },
  {
    id: "n3",
    kind: "notification",
    topic: "payment",
    title: "Payment received",
    body: "14x Membership",
    when: "Monday",
    href: "/app/billing",
    unread: false,
  },
  {
    id: "n4",
    kind: "notification",
    topic: "reminder",
    title: "Session tomorrow",
    body: "Small Group Training · 6:00 AM",
    when: "Monday",
    href: "/app/bookings",
    unread: true,
  },
];

function topicLabel(item: FeedItem) {
  if (item.kind === "conversation") return "Coach";
  switch (item.topic) {
    case "booking":
      return "Booking";
    case "payment":
      return "Payment";
    case "reminder":
      return "Reminder";
    case "program":
      return "Program";
    case "facility":
      return "Update";
    default:
      return "Notice";
  }
}

export function InboxBrowser() {
  const [tab, setTab] = useState<TabId>("inbox");
  const [items, setItems] = useState(INITIAL);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const visible = useMemo(() => {
    if (tab === "conversations")
      return items.filter((i) => i.kind === "conversation");
    if (tab === "notifications")
      return items.filter((i) => i.kind === "notification");
    return items;
  }, [tab, items]);

  function markRead(id: string) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, unread: false } : i)),
    );
  }

  function dismiss(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (openId === id) setOpenId(null);
  }

  function openConversation(id: string) {
    markRead(id);
    setOpenId((current) => (current === id ? null : id));
    setDraft("");
  }

  function sendReply(id: string) {
    if (!draft.trim()) return;
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              body: draft.trim(),
              when: "Just now",
              unread: false,
            }
          : i,
      ),
    );
    setDraft("");
    setOpenId(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Communication
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase">
          Inbox
        </h1>
        <p className="mt-2 text-sm text-muted">
          Talk with your coach and see booking updates.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex min-h-10 items-center border px-4 text-xs font-semibold tracking-wide uppercase",
              tab === t.id
                ? "border-brand bg-brand text-brand-foreground"
                : "border-border text-muted hover:border-brand hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="divide-y divide-border border border-border bg-surface">
        {visible.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted">
            You’re all caught up.
          </p>
        ) : (
          visible.map((item) => {
            const isOpen = openId === item.id;
            return (
              <article
                key={item.id}
                className={cn(
                  "px-5 py-4",
                  item.unread && "bg-brand/5",
                )}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-wide text-brand uppercase">
                    {item.unread ? (
                      <span
                        className="size-1.5 rounded-full bg-brand"
                        aria-label="Unread"
                      />
                    ) : null}
                    {topicLabel(item)}
                  </p>
                  <p className="text-xs text-muted">{item.when}</p>
                </div>
                <h2 className="mt-1 font-display text-lg tracking-wide uppercase">
                  {item.title}
                </h2>
                <p className="mt-1 text-sm text-muted">{item.body}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {item.kind === "conversation" ? (
                    <button
                      type="button"
                      onClick={() => openConversation(item.id)}
                      className="inline-flex min-h-10 items-center bg-brand px-3 text-[11px] font-semibold tracking-wide text-brand-foreground uppercase"
                    >
                      {isOpen ? "Close" : "Reply"}
                    </button>
                  ) : (
                    <>
                      {item.href ? (
                        <Link
                          href={item.href}
                          onClick={() => markRead(item.id)}
                          className="inline-flex min-h-10 items-center border border-border px-3 text-[11px] font-semibold tracking-wide uppercase"
                        >
                          View
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => dismiss(item.id)}
                        className="inline-flex min-h-10 items-center border border-border px-3 text-[11px] font-semibold tracking-wide uppercase"
                      >
                        Dismiss
                      </button>
                    </>
                  )}
                </div>

                {item.kind === "conversation" && isOpen ? (
                  <div className="mt-4 space-y-3 border-t border-border pt-4">
                    <label className="block space-y-2 text-sm">
                      <span className="text-xs font-semibold tracking-wide text-muted uppercase">
                        Your reply
                      </span>
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={3}
                        className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
                        placeholder="Message Coach Robert…"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => sendReply(item.id)}
                      disabled={!draft.trim()}
                      className="inline-flex min-h-10 items-center bg-brand px-4 text-[11px] font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
