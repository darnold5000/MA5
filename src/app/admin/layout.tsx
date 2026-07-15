import { AdminShell } from "@/components/platform/admin-shell";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AdminShell
      title="Operations"
      subtitle="Schedule, bookings, and products for the Mindbody-replacement demo."
    >
      {children}
    </AdminShell>
  );
}
