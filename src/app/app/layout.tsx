import { AppShell } from "@/components/platform/app-shell";
import { demoClient } from "@/content/demo-persona";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { getActiveMembershipForUser } from "@/lib/stripe/sync-membership";

export default async function ClientAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = isSupabasePublicConfigured()
    ? await getSessionUser()
    : null;
  const membership = session
    ? await getActiveMembershipForUser(session.id)
    : null;

  const memberName =
    session?.profile?.full_name ?? demoClient.fullName;
  const memberPlan =
    membership?.productName
      ?.replace(/Monthly\s+/i, "")
      .replace(/\s+Membership$/i, " Membership")
      .trim() ?? demoClient.membership.shortLabel;

  return (
    <AppShell
      memberName={memberName}
      memberPlan={memberPlan}
      inboxUnread={demoClient.inboxUnread}
    >
      {children}
    </AppShell>
  );
}
