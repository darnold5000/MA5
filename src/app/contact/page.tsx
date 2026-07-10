import type { Metadata } from "next";

import { ButtonLink } from "@/components/shared/button-link";
import { SectionHeading } from "@/components/shared/section-heading";
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
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            <a href={siteConfig.social.instagram} target="_blank" rel="noreferrer" className="hover:text-brand">
              Instagram
            </a>
            <a href={siteConfig.social.facebook} target="_blank" rel="noreferrer" className="hover:text-brand">
              Facebook
            </a>
            <a href={siteConfig.social.linkedin} target="_blank" rel="noreferrer" className="hover:text-brand">
              LinkedIn
            </a>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/book">Book Now or Schedule a Consultation</ButtonLink>
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
