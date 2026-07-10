import type { Metadata } from "next";

import { BookingShell } from "@/components/booking/booking-shell";
import { MindbodyWidget } from "@/components/booking/mindbody-widget";
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
      <MindbodyWidget
        serviceLabel={option.label}
        // TODO: Pass official Mindbody scriptSrc and widgetMarkup from Branded Web Tools.
        scriptSrc={undefined}
        widgetMarkup={undefined}
      />
    </BookingShell>
  );
}
