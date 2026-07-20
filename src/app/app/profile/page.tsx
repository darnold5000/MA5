import type { Metadata } from "next";

import { MemberAttributionSection } from "@/components/marketing/member-attribution-section";
import { MembershipSection } from "@/components/profile/membership-section";
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
import { getMemberAttribution } from "@/features/marketing";
import { getClientProfileSettings } from "@/features/settings/queries";
import { getMembershipSummary } from "@/lib/billing/membership-summary";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";

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
    ? await getMembershipSummary(session.id)
    : await getMembershipSummary("demo-client");

  const userId = session?.id ?? "demo-client";
  const attribution = await getMemberAttribution(userId);

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

      <section id="membership" className="border border-border bg-surface p-5 sm:p-6 scroll-mt-24">
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Membership
        </p>
        <div className="mt-5">
          <MembershipSection membership={membership} />
        </div>
      </section>

      <MemberAttributionSection attribution={attribution} />

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
