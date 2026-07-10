import type { Metadata } from "next";

import { ButtonLink } from "@/components/shared/button-link";
import { SectionHeading } from "@/components/shared/section-heading";
import { siteConfig } from "@/content/site-config";

export const metadata: Metadata = {
  title: "Results",
  description:
    "Client transformations and results from MA5 Performance in Avon, Indiana.",
};

export default function TransformationsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        title="Transformations"
        description={`“${siteConfig.tagline}” Transform your mind and body with purposeful coaching at MA5.`}
      />
      <div className="mt-10 border border-dashed border-border bg-surface p-8">
        <p className="text-sm leading-relaxed text-muted">
          The current MA5 website does not publish detailed before-and-after
          stories or named testimonials. This page will showcase approved client
          results once permissioned photos and quotes are provided.
        </p>
      </div>
      <div className="mt-8">
        <ButtonLink href="/book?type=assessment">Start your transformation</ButtonLink>
      </div>
    </div>
  );
}
