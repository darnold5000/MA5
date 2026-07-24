import { AdminShell } from "@/components/platform/admin-shell";

/** Hub pages use session, tenant, and Supabase — never static prerender. */
export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AdminShell>{children}</AdminShell>;
}
