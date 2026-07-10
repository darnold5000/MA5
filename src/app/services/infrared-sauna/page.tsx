import type { Metadata } from "next";
import Image from "next/image";

import { ButtonLink } from "@/components/shared/button-link";
import { SectionHeading } from "@/components/shared/section-heading";
import { saunaCopy } from "@/content/services";
import { siteConfig } from "@/content/site-config";

export const metadata: Metadata = {
  title: "Infrared Sauna",
  description:
    "Private infrared sauna room at MA5 Performance in Avon, Indiana — relax, restore, and renew with recovery-focused heat therapy.",
};

export default function SaunaPage() {
  return (
    <div>
      <section className="border-b border-border bg-surface px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Recovery"
            title={saunaCopy.headline}
            description={saunaCopy.tagline}
          />
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
            {saunaCopy.intro}
          </p>

          <div className="mt-10 overflow-hidden border border-border bg-black">
            <div className="relative aspect-video w-full">
              <iframe
                src={saunaCopy.video.embedUrl}
                title={saunaCopy.video.title}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/book?type=sauna">Book Sauna</ButtonLink>
            <ButtonLink
              href={`mailto:${siteConfig.contact.email}?subject=Infrared%20Sauna%20Pricing`}
              variant="secondary"
            >
              Email to inquire about pricing
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            title="How Infrared Saunas Can Improve Your Health"
            description="Benefits highlighted on the current MA5 site, cleaned up for clearer reading."
          />

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {saunaCopy.benefits.map((benefit) => (
              <article
                key={benefit.title}
                className="flex h-full flex-col border border-border bg-surface"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src={benefit.imageSrc}
                    alt={benefit.imageAlt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="font-display text-2xl tracking-wide uppercase">
                    {benefit.title}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {benefit.body}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-12 border border-border bg-surface-strong p-8 text-center">
            <h2 className="font-display text-3xl tracking-wide uppercase">
              Ready to recover?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted">
              Book a sauna session or email MA5 for current pricing and
              availability.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/book?type=sauna">Book Sauna</ButtonLink>
              <ButtonLink
                href={`mailto:${siteConfig.contact.email}?subject=Infrared%20Sauna%20Pricing`}
                variant="secondary"
              >
                Email about pricing
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
