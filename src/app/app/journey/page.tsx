import type { Metadata } from "next";

import { MyJourneyView } from "@/components/journey/my-journey-view";
import { getMemberJourney } from "@/features/journey/queries";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "My Journey",
  robots: { index: false, follow: false },
};

export default async function JourneyPage() {
  const session = isSupabasePublicConfigured() ? await getSessionUser() : null;
  const userId = session?.id ?? "demo-client";
  const journey = session
    ? await getMemberJourney(session.id)
    : { goals: [], photos: [], timeline: [] };

  return (
    <div className="mx-auto w-full max-w-none space-y-5">
      <header className="space-y-1.5 border-b border-border/60 pb-5">
        <h1 className="font-display text-2xl tracking-wide uppercase sm:text-[1.75rem]">
          Your Fitness Journey
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted">
          Set goals, capture progress photos, and watch your story unfold over
          time.
        </p>
      </header>

      <MyJourneyView
        userId={userId}
        initialData={journey}
        demoMode={!isSupabasePublicConfigured()}
      />
    </div>
  );
}
