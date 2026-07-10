import type { Metadata } from "next";
import Image from "next/image";

import { ButtonLink } from "@/components/shared/button-link";
import { SectionHeading } from "@/components/shared/section-heading";
import { aboutCopy, fitnessPillars } from "@/content/services";
import { siteConfig } from "@/content/site-config";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about MA5 Performance, Robert Anderson, and the five components of fitness behind the coaching approach in Avon, Indiana.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="relative aspect-[4/5] overflow-hidden border border-border">
          <Image
            src="/images/brand/ma5-logo.jpeg"
            alt="MA5 Performance logo"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 40vw"
          />
        </div>
        <div>
          <SectionHeading
            eyebrow="About MA5"
            title={aboutCopy.headline}
            description={aboutCopy.body[0]}
          />
          {aboutCopy.body.slice(1).map((paragraph) => (
            <p key={paragraph} className="mt-4 text-sm leading-relaxed text-muted">
              {paragraph}
            </p>
          ))}
          <div className="mt-6 border border-border bg-surface p-5">
            <p className="font-display text-2xl tracking-wide uppercase">
              {siteConfig.owner.name}
            </p>
            <p className="mt-2 text-sm text-muted">
              {siteConfig.owner.credentials}
            </p>
            <a
              href={siteConfig.owner.linkedin}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex text-sm text-brand hover:underline"
            >
              LinkedIn profile
            </a>
          </div>
          <div className="mt-8">
            <ButtonLink href="/book?type=assessment">Book an Assessment</ButtonLink>
          </div>
        </div>
      </div>

      <section className="mt-16">
        <SectionHeading
          title="Five Components of Fitness"
          description="Corrected from the current site mission statement and retained as the MA5 training philosophy."
        />
        <ol className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {fitnessPillars.map((pillar, index) => (
            <li key={pillar.title} className="border border-border bg-surface p-5">
              <p className="font-display text-3xl text-brand">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h2 className="mt-3 font-display text-xl tracking-wide uppercase">
                {pillar.title}
              </h2>
              <p className="mt-2 text-sm text-muted">{pillar.description}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
