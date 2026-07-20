import Image from "next/image";

import { ButtonLink } from "@/components/shared/button-link";
import { SectionHeading } from "@/components/shared/section-heading";
import { coachCopy } from "@/content/services";

export function TeamSection() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="relative aspect-[4/5] overflow-hidden border border-border">
          <Image
            src={coachCopy.imageSrc}
            alt={coachCopy.imageAlt}
            fill
            sizes="(max-width: 1024px) 100vw, 40vw"
            className="object-cover"
          />
        </div>
        <div>
          <SectionHeading
            eyebrow="Coaching"
            title={coachCopy.headline}
            description={`${coachCopy.name} | ${coachCopy.title}`}
          />
          {coachCopy.body.map((paragraph) => (
            <p key={paragraph} className="mt-4 text-sm leading-relaxed text-muted">
              {paragraph}
            </p>
          ))}
          <div className="mt-8">
            <ButtonLink href="/about">Learn More About MA5</ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
