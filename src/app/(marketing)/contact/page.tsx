import type { Metadata } from "next";

import { ContactLeadForm } from "@/components/marketing/contact-lead-form";
import { ButtonLink } from "@/components/shared/button-link";
import { SectionHeading } from "@/components/shared/section-heading";
import { SocialLinks } from "@/components/shared/social-links";
import { siteConfig } from "@/content/site-config";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact MA5 Performance in Avon, Indiana to ask questions or get started with training.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        title="Contact MA5 Performance"
        description="If you are ready to take the next step toward your health and fitness goals, join the MA5 community today."
      />

      <ContactLeadForm />

      <div className="mt-10 space-y-6 border border-border bg-surface p-6 sm:p-8">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
            Email
          </p>
          <a
            href={`mailto:${siteConfig.contact.email}`}
            className="mt-2 inline-flex text-lg text-foreground hover:text-brand"
          >
            {siteConfig.contact.email}
          </a>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
            Location
          </p>
          <p className="mt-2 text-lg text-foreground">
            {siteConfig.location.fullAddress}
          </p>
          <a
            href={siteConfig.location.mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex text-sm text-brand hover:underline"
          >
            Open in Google Maps
          </a>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
            Hours
          </p>
          <p className="mt-2 text-sm text-muted">{siteConfig.hours.summary}</p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
            Social
          </p>
          <SocialLinks className="mt-2" />
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href={siteConfig.booking.path}>Book Now or Schedule a Consultation</ButtonLink>
        <ButtonLink
          href={`mailto:${siteConfig.contact.email}?subject=MA5%20Inquiry`}
          variant="secondary"
        >
          Email MA5
        </ButtonLink>
      </div>
    </div>
  );
}
