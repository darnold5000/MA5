import type { Metadata } from "next";
import Link from "next/link";

import { BookingShell } from "@/components/booking/booking-shell";
import { ButtonLink } from "@/components/shared/button-link";
import { getBookingOption } from "@/content/booking";
import { env } from "@/lib/env";

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
            Native booking demo
          </p>
          <h1 className="mt-2 font-display text-4xl tracking-wide uppercase sm:text-5xl">
            Book {option.label}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            This demo branch replaces the Mindbody embed with MA5 schedule
            booking. Choose a session in the client portal — marketing pages are
            otherwise unchanged.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/app/schedule">Open MA5 schedule</ButtonLink>
          <ButtonLink href="/app/billing" variant="secondary">
            Memberships
          </ButtonLink>
          <a
            href={env.mindbodyBookingUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center border border-border px-5 text-xs font-semibold tracking-wide uppercase"
          >
            Mindbody fallback
          </a>
        </div>
        <p className="text-xs text-muted">
          Prefer the old flow?{" "}
          <Link href={env.mindbodyBookingUrl} className="text-brand hover:underline">
            Continue on Mindbody Explore
          </Link>
          .
        </p>
      </section>
    </BookingShell>
  );
}
