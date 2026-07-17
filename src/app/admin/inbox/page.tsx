import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Inbox · Operations",
  robots: { index: false, follow: false },
};

/** Legacy route — Communication lives under /admin/messages */
export default function AdminInboxRedirect() {
  redirect("/admin/messages");
}
