import Image from "next/image";

import { ButtonLink } from "@/components/shared/button-link";
import { SectionHeading } from "@/components/shared/section-heading";
import { aboutCopy } from "@/content/services";
import { siteConfig } from "@/content/site-config";

export function TeamSection() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="relative aspect-[4/5] overflow-hidden border border-border">
          <Image
            src="/images/facility/facility-1.jpeg"
            alt="MA5 Performance sports coaching session"
            fill
            sizes="(max-width: 1024px) 100vw, 40vw"
            className="object-cover"
          />
        </div>
        <div>
          <SectionHeading
            eyebrow="Coaching"
            title={aboutCopy.headline}
            description={aboutCopy.body[0]}
          />
          <p className="mt-4 text-sm leading-relaxed text-muted">
            {aboutCopy.body[1]}
          </p>
          <p className="mt-4 text-sm text-muted">
            Led by {siteConfig.owner.name}, {siteConfig.owner.credentials}.
          </p>
          <div className="mt-8">
            <ButtonLink href="/about">Meet the Team</ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
