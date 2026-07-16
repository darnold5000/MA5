import type { Metadata } from "next";

import { ScheduleBrowser } from "@/components/booking/schedule-browser";
import { readDemoBookings } from "@/features/booking/demo-store";
import {
  listPublishedSessions,
  listUserBookings,
} from "@/features/scheduling/queries";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Reserve",
  robots: { index: false, follow: false },
};

type SchedulePageProps = {
  searchParams: Promise<{ service?: string }>;
};

export default async function SchedulePage({ searchParams }: SchedulePageProps) {
  const params = await searchParams;
  const sessions = await listPublishedSessions();
  const configured = isSupabasePublicConfigured();
  const session = configured ? await getSessionUser() : null;
  const dbBookings = configured
    ? await listUserBookings(session?.id ?? null)
    : [];
  const demoBookings = await readDemoBookings();

  const activeBookings = [...demoBookings, ...dbBookings].filter(
    (b) => b.status !== "cancelled" && b.status !== "refunded",
  );

  const enrolledBySessionId: Record<string, string> = {};
  for (const b of activeBookings) {
    enrolledBySessionId[b.sessionId] = b.paymentStatus;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Reserve
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase">
          Upcoming sessions
        </h1>
        <p className="mt-2 text-sm text-muted">
          Find a time that fits and reserve your spot — pay online or at the
          facility.
        </p>
      </div>
      <ScheduleBrowser
        sessions={sessions}
        enrolledBySessionId={enrolledBySessionId}
        initialService={params.service}
      />
    </div>
  );
}
