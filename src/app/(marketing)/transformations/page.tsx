import type { Metadata } from "next";

import { ButtonLink } from "@/components/shared/button-link";
import { SectionHeading } from "@/components/shared/section-heading";
import { TransformationGallery } from "@/components/transformations/transformation-gallery";
import { siteConfig } from "@/content/site-config";
import { transformations } from "@/content/transformations";

export const metadata: Metadata = {
  title: "Results",
  description:
    "Client transformations and results from MA5 Performance in Avon, Indiana.",
};

export default function TransformationsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Results"
        title="Transformations"
        description={`“${siteConfig.tagline}” Transform your mind and body today.`}
        align="center"
        className="mx-auto"
      />

      <TransformationGallery items={transformations} className="mt-12" />

      <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
        <ButtonLink href={siteConfig.booking.path}>
          Start your transformation
        </ButtonLink>
        <ButtonLink href="/contact" variant="secondary">
          Contact us
        </ButtonLink>
      </div>
    </div>
  );
}
