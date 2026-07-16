"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type TabId = "inbox" | "conversations" | "announcements" | "notifications";

type FeedItem = {
  id: string;
  kind: "announcement" | "conversation" | "program" | "payment" | "booking";
  title: string;
  body: string;
  when: string;
};

const TABS: { id: TabId; label: string }[] = [
  { id: "inbox", label: "Inbox" },
  { id: "conversations", label: "Conversations" },
  { id: "announcements", label: "Announcements" },
  { id: "notifications", label: "Notifications" },
];

const FEED: FeedItem[] = [
  {
    id: "1",
    kind: "announcement",
    title: "New announcement",
    body: "Recovery Room closed Friday",
    when: "2 hours ago",
  },
  {
    id: "2",
    kind: "conversation",
    title: "Coach Robert",
    body: "Great work yesterday — let’s keep Thursday on the schedule.",
    when: "Yesterday",
  },
  {
    id: "3",
    kind: "program",
    title: "New program assigned",
    body: "Summer Strength · Week 4",
    when: "Yesterday",
  },
  {
    id: "4",
    kind: "payment",
    title: "Payment successful",
    body: "14x Membership",
    when: "Monday",
  },
  {
    id: "5",
    kind: "booking",
    title: "Booking confirmed",
    body: "Small Group Training · Friday 2:00 PM",
    when: "Monday",
  },
];

function kindLabel(kind: FeedItem["kind"]) {
  switch (kind) {
    case "announcement":
      return "Announcement";
    case "conversation":
      return "Coach";
    case "program":
      return "Program";
    case "payment":
      return "Payment";
    case "booking":
      return "Booking";
  }
}

export function InboxBrowser() {
  const [tab, setTab] = useState<TabId>("inbox");

  const items = useMemo(() => {
    if (tab === "inbox") return FEED;
    if (tab === "announcements")
      return FEED.filter((i) => i.kind === "announcement");
    if (tab === "conversations")
      return FEED.filter((i) => i.kind === "conversation");
    return FEED.filter(
      (i) =>
        i.kind === "payment" ||
        i.kind === "booking" ||
        i.kind === "program",
    );
  }, [tab]);

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
          Your coach, facility updates, and what just happened — in one place.
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
        {items.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted">Nothing here yet.</p>
        ) : (
          items.map((item) => (
            <article key={item.id} className="px-5 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[10px] font-semibold tracking-wide text-brand uppercase">
                  {kindLabel(item.kind)}
                </p>
                <p className="text-xs text-muted">{item.when}</p>
              </div>
              <h2 className="mt-1 font-display text-lg tracking-wide uppercase">
                {item.title}
              </h2>
              <p className="mt-1 text-sm text-muted">{item.body}</p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
