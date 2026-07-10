import type { Metadata } from "next";
import Image from "next/image";

import { ButtonLink } from "@/components/shared/button-link";
import { SectionHeading } from "@/components/shared/section-heading";
import { sportsCopy } from "@/content/services";

export const metadata: Metadata = {
  title: "Sports Performance",
  description:
    "Speed, agility, strength, and sport-specific training for athletes at MA5 Performance in Avon, Indiana.",
};

export default function SportsPerformancePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div>
          <SectionHeading
            eyebrow="Athletes"
            title="Sports Performance Training"
            description={sportsCopy.intro}
          />
          <div className="mt-8">
            <ButtonLink href="/book?type=sports-performance">
              Schedule Your Training Today
            </ButtonLink>
          </div>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden border border-border">
          <Image
            src="/images/facility/facility-1.jpeg"
            alt="Outdoor sports performance coaching with MA5"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 40vw"
          />
        </div>
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {sportsCopy.sections.map((section) => (
          <article key={section.title} className="border border-border bg-surface p-6">
            <h2 className="font-display text-2xl tracking-wide uppercase">
              {section.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{section.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
