import { AppShell } from "@/components/platform/app-shell";

export default function ClientAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppShell
      title="Client portal"
      subtitle="Book sessions, view bookings, and manage memberships — native MA5, not Mindbody."
      footerNote="Mindbody-replacement demo — public marketing look and feel is unchanged."
    >
      {children}
    </AppShell>
  );
}
