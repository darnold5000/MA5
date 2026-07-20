import type { Metadata } from "next";
import Image from "next/image";

import { ButtonLink } from "@/components/shared/button-link";
import { SectionHeading } from "@/components/shared/section-heading";
import { openGymCopy } from "@/content/services";
import { siteConfig } from "@/content/site-config";

export const metadata: Metadata = {
  title: "Open Gym",
  description:
    "24/7 private open-gym access with key-fob entry and the MA5 training app in Avon, Indiana.",
};

export default function OpenGymPage() {
  const featuredImage =
    openGymCopy.images.find((image) => "featured" in image && image.featured) ??
    openGymCopy.images[0];
  const galleryImages = openGymCopy.images.filter(
    (image) => image.src !== featuredImage.src,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Open Gym"
        title="Private 24/7 Gym Access"
        description={openGymCopy.intro}
      />

      <ul className="mt-8 max-w-3xl space-y-3 text-sm leading-relaxed text-muted">
        {openGymCopy.perks.map((perk) => (
          <li key={perk} className="border-l-2 border-brand pl-4">
            {perk}
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href={siteConfig.booking.path}>Sign up today</ButtonLink>
        <ButtonLink
          href={`mailto:${siteConfig.contact.email}?subject=Open%20Gym%20Sign%20up`}
          variant="secondary"
        >
          Email to join
        </ButtonLink>
      </div>

      <section className="mt-14 space-y-4">
        <div className="relative aspect-[21/9] overflow-hidden border border-border sm:aspect-[16/7]">
          <Image
            src={featuredImage.src}
            alt={featuredImage.alt}
            fill
            className="object-cover"
            sizes="(max-width: 1280px) 100vw, 1280px"
            priority
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {galleryImages.map((image) => (
            <div
              key={image.src}
              className="relative aspect-[4/3] overflow-hidden border border-border"
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
