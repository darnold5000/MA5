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
  const journey = session ? await getMemberJourney(session.id) : { goals: [], photos: [], timeline: [] };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-wide uppercase">
          Your Fitness Journey
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Set goals, capture progress photos, and watch your story unfold over
          time.
        </p>
      </div>

      <MyJourneyView
        userId={userId}
        initialData={journey}
        demoMode={!isSupabasePublicConfigured()}
      />
    </div>
  );
}
