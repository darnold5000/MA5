import type { Metadata } from "next";
import Image from "next/image";

import { ButtonLink } from "@/components/shared/button-link";
import { SectionHeading } from "@/components/shared/section-heading";
import { saunaCopy } from "@/content/services";
import { siteConfig } from "@/content/site-config";

export const metadata: Metadata = {
  title: "Infrared Sauna",
  description:
    "Private infrared sauna sessions for recovery, relaxation, and restoration at MA5 Performance.",
};

export default function SaunaPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Recovery"
        title="Private Infrared Sauna Room"
        description={saunaCopy.intro}
      />

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {saunaCopy.benefits.map((benefit, index) => {
          const images = [
            "/images/services/sauna-detox.png",
            "/images/services/sauna-stress.jpeg",
            "/images/services/sauna-recovery.jpeg",
          ];
          return (
            <article key={benefit.title} className="border border-border bg-surface">
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image
                  src={images[index] ?? images[0]}
                  alt={benefit.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <div className="p-5">
                <h2 className="font-display text-2xl tracking-wide uppercase">
                  {benefit.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {benefit.body}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href="/book?type=sauna">Book Sauna</ButtonLink>
        <ButtonLink
          href={`mailto:${siteConfig.contact.email}?subject=Infrared%20Sauna%20Pricing`}
          variant="secondary"
        >
          Email to inquire about pricing
        </ButtonLink>
      </div>
    </div>
  );
}
