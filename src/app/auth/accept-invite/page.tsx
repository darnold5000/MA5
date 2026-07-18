import type { Metadata } from "next";

import { AcceptInviteForm } from "@/components/platform/accept-invite-form";

export const metadata: Metadata = {
  title: "Accept invitation",
  robots: { index: false, follow: false },
};

export default function AcceptInvitePage() {
  return (
    <div className="flex min-h-full flex-1 items-start justify-center px-4 py-8 sm:items-center sm:py-12">
      <AcceptInviteForm />
    </div>
  );
}
