import { AppShell } from "@/components/platform/app-shell";
import { resolveClientFullName } from "@/content/demo-persona";
import { getUnreadBadgeCount } from "@/features/messaging";
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

  const memberName = resolveClientFullName({
    email: session?.email ?? session?.profile?.email,
    fullName: session?.profile?.full_name,
  });
  const memberPlan =
    membership?.productName
      ?.replace(/Monthly\s+/i, "")
      .replace(/\s+Membership$/i, " Membership")
      .trim() ?? "No plan";

  const inboxUnread = await getUnreadBadgeCount({ staff: false });

  return (
    <AppShell
      memberName={memberName}
      memberPlan={memberPlan}
      inboxUnread={inboxUnread}
    >
      {children}
    </AppShell>
  );
}
