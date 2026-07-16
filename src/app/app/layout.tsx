import { AppShell } from "@/components/platform/app-shell";
import {
  demoClient,
  resolveClientFullName,
} from "@/content/demo-persona";
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
