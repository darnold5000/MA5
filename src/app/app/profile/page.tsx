import type { Metadata } from "next";
import Link from "next/link";

import { ManageBillingButton } from "@/components/billing/manage-billing-button";
import { SignOutButton } from "@/components/platform/sign-out-button";
import { InstallMa5Section } from "@/components/pwa/install-ma5-section";
import { ProfileAvatarUpload } from "@/components/profile/profile-avatar-upload";
import {
  ProfileContactForm,
  ProfileEmergencyForm,
  ProfileNotificationsForm,
  ProfilePasswordForm,
  ProfileWaiversList,
} from "@/components/profile/profile-forms";
import { getClientProfileSettings } from "@/features/settings/queries";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { getActiveMembershipForUser } from "@/lib/stripe/sync-membership";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: false },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-border bg-surface p-5 sm:p-6">
      <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
        {title}
      </p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function ProfilePage() {
  const session = isSupabasePublicConfigured()
    ? await getSessionUser()
    : null;
  const profile = await getClientProfileSettings();

  const membership = session
    ? await getActiveMembershipForUser(session.id)
    : null;

  const planName = membership?.productName ?? "No active plan";
  const planStatus = membership?.status ?? "None";
  const renewsOn = membership?.currentPeriodEnd
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(membership.currentPeriodEnd))
    : null;

  const userId = session?.id ?? "demo-client";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Profile
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase">
          {profile.fullName || profile.preferredName}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Changes save to your account and show up here after refresh.
        </p>
      </div>

      <ProfileAvatarUpload
        userId={userId}
        fullName={profile.fullName || profile.preferredName}
        avatarUrl={profile.avatarUrl}
      />

      <Section title="Contact">
        <ProfileContactForm
          key={`contact-${profile.fullName}-${profile.phone}-${profile.preferredName}`}
          initial={{
            fullName: profile.fullName,
            preferredName: profile.preferredName,
            email: profile.email,
            phone: profile.phone,
          }}
        />
      </Section>

      <Section title="Emergency contact">
        <ProfileEmergencyForm
          key={`emergency-${profile.emergencyName}-${profile.emergencyPhone}`}
          initial={{
            emergencyName: profile.emergencyName,
            emergencyRelationship: profile.emergencyRelationship,
            emergencyPhone: profile.emergencyPhone,
            emergencyNotes: profile.emergencyNotes,
          }}
        />
      </Section>

      <Section title="Membership">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">
              Current plan
            </p>
            <p className="mt-1 text-sm text-foreground">{planName}</p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">
              Status
            </p>
            <p className="mt-1 text-sm text-foreground">{planStatus}</p>
            {renewsOn ? (
              <p className="mt-0.5 text-xs text-muted">Renews {renewsOn}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/app/billing"
            className="inline-flex min-h-11 items-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase"
          >
            View plans
          </Link>
          {session ? (
            <ManageBillingButton label="Payment methods" />
          ) : (
            <Link
              href="/app/billing"
              className="inline-flex min-h-11 items-center border border-border px-4 text-xs font-semibold tracking-wide uppercase"
            >
              Payment methods
            </Link>
          )}
        </div>
      </Section>

      <Section title="Waivers">
        <ProfileWaiversList waivers={profile.waivers} />
      </Section>

      <Section title="Notifications">
        <ProfileNotificationsForm
          key={`notify-${profile.notifyCoachMessages}-${profile.notifySessionReminders}-${profile.notifyProgramUpdates}-${profile.notifyBillingAlerts}`}
          initial={{
            notifyCoachMessages: profile.notifyCoachMessages,
            notifySessionReminders: profile.notifySessionReminders,
            notifyProgramUpdates: profile.notifyProgramUpdates,
            notifyBillingAlerts: profile.notifyBillingAlerts,
          }}
        />
      </Section>

      <Section title="Install MA5">
        <InstallMa5Section
          signedIn={Boolean(session)}
          vapidPublicKey={
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || null
          }
        />
      </Section>

      <Section title="Password & security">
        <ProfilePasswordForm email={profile.email} />
        <div className="mt-4">
          <SignOutButton className="inline-flex min-h-11 items-center border border-border px-4 text-xs font-semibold tracking-wide uppercase" />
        </div>
      </Section>
    </div>
  );
}
