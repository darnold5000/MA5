import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Inbox · MA5",
  robots: { index: false, follow: false },
};

/** Legacy route — messages live under /app/messages */
export default function ClientInboxRedirect() {
  redirect("/app/messages");
}
