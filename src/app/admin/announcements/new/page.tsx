import type { Metadata } from "next";

import { AdminAnnouncementComposer } from "@/components/communication/admin-announcement-composer";

export const metadata: Metadata = {
  title: "New announcement · Operations",
  robots: { index: false, follow: false },
};

export default function AdminNewAnnouncementPage() {
  return <AdminAnnouncementComposer estimatedAudience={42} />;
}
