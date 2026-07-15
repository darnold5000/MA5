import type { Metadata } from "next";

import { BookingShell } from "@/components/booking/booking-shell";
import { ButtonLink } from "@/components/shared/button-link";
import { getBookingOption } from "@/content/booking";

export const metadata: Metadata = {
  title: "Book",
  description:
    "Book a fitness assessment, training session, InBody scan, or sauna appointment with MA5 Performance in Avon, Indiana.",
};

type BookPageProps = {
  searchParams: Promise<{
    type?: string;
  }>;
};

export default async function BookPage({ searchParams }: BookPageProps) {
  const params = await searchParams;
  const option = getBookingOption(params.type);

  return (
    <BookingShell activeQuery={option.query}>
      <section className="space-y-6 border border-border bg-surface p-6 sm:p-8">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
            Member booking
          </p>
          <h1 className="mt-2 font-display text-4xl tracking-wide uppercase sm:text-5xl">
            Book {option.label}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            Choose an available time in the MA5 schedule. Existing members can
            manage bookings and memberships from the client portal.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/app/schedule">View schedule</ButtonLink>
          <ButtonLink href="/login" variant="secondary">
            Client login
          </ButtonLink>
        </div>
      </section>
    </BookingShell>
  );
}
