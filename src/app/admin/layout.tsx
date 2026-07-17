import { AdminShell } from "@/components/platform/admin-shell";
import { getUnreadBadgeCount } from "@/features/messaging";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const communicationUnread = await getUnreadBadgeCount({ staff: true });
  return (
    <AdminShell communicationUnread={communicationUnread}>{children}</AdminShell>
  );
}
