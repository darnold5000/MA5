import { AdminShell } from "@/components/platform/admin-shell";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AdminShell
      title="Operations"
      subtitle="Staff tools for clients, schedule, products, and analytics."
      nav={[
        { href: "/admin", label: "Overview", active: true },
        { href: "/admin#clients", label: "Clients" },
        { href: "/admin#schedule", label: "Schedule" },
        { href: "/admin#products", label: "Products" },
        { href: "/admin#analytics", label: "Analytics" },
      ]}
    >
      {children}
    </AdminShell>
  );
}
