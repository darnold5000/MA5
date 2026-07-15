import { AppShell } from "@/components/platform/app-shell";

export default function ClientAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppShell>{children}</AppShell>;
}
