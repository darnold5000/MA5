import type { Metadata } from "next";

import { InboxBrowser } from "@/components/communication/inbox-browser";

export const metadata: Metadata = {
  title: "Inbox",
  robots: { index: false, follow: false },
};

export default function InboxPage() {
  return <InboxBrowser />;
}
