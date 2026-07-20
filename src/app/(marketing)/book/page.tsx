import type { Metadata } from "next";

import { BookingRequestForm } from "@/components/marketing/booking-request-form";
import { SectionHeading } from "@/components/shared/section-heading";
import { bookingRequestServiceLabel } from "@/content/booking-request";
import { siteConfig } from "@/content/site-config";

export const metadata: Metadata = {
  title: "Book a Consultation",
  description:
    "Request a fitness assessment, InBody scan, or consultation at MA5 Performance in Avon, Indiana.",
};

type BookPageProps = {
  searchParams: Promise<{ service?: string }>;
};

export default async function BookPage({ searchParams }: BookPageProps) {
  const params = await searchParams;
  const serviceLabel = params.service
    ? bookingRequestServiceLabel(params.service)
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Get started"
        title="Book a consultation or assessment"
        description={
          serviceLabel
            ? `You selected ${serviceLabel}. Complete the form and we will follow up by email or phone to confirm your appointment.`
            : "Assessments, InBody scans, and consultations are scheduled by our team. Submit your request and we will follow up by email or phone."
        }
      />

      <div className="mt-10">
        <BookingRequestForm
          initialService={params.service ?? null}
          sourcePath={
            params.service ? `/book?service=${params.service}` : "/book"
          }
        />
      </div>

      <p className="mt-8 text-center text-sm text-muted">
        Prefer email?{" "}
        <a
          href={`mailto:${siteConfig.contact.email}?subject=MA5%20booking%20request`}
          className="text-brand hover:underline"
        >
          {siteConfig.contact.email}
        </a>
      </p>
    </div>
  );
}
