import { AppShell } from "@/components/platform/app-shell";

export default function ClientAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppShell
      title="Dashboard"
      subtitle="Your bookings, memberships, and programs will live here."
      nav={[
        { href: "/app", label: "Dashboard", active: true },
        { href: "/app#schedule", label: "Schedule" },
        { href: "/app#billing", label: "Billing" },
        { href: "/app#programs", label: "Programs" },
        { href: "/login", label: "Account" },
      ]}
      footerNote="Platform foundation preview — marketing site design is unchanged."
    >
      {children}
    </AppShell>
  );
}
