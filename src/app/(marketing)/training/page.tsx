import type { Metadata } from "next";
import Image from "next/image";

import { ButtonLink } from "@/components/shared/button-link";
import { PosterVideo } from "@/components/marketing/poster-video";
import { SectionHeading } from "@/components/shared/section-heading";
import { TrainingPricingSection } from "@/components/training/training-pricing-section";
import { siteConfig } from "@/content/site-config";
import { trainingCopy } from "@/content/services";

export const metadata: Metadata = {
  title: "Training",
  description:
    "Semi-private and small-group personal training with assessments at MA5 Performance in Avon, Indiana.",
};

export default function TrainingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Training"
        title="Semi-Private and Small Group Coaching"
        description="Schedule an assessment to find the right path — customized one-on-one coaching or small-group sessions capped at 10 people."
      />

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <article className="border border-border bg-surface p-6">
          <div className="relative mb-6 aspect-[16/9] overflow-hidden">
            <Image
              src="/images/services/semi-private-training.png"
              alt="Coach guiding a client through a barbell lift at MA5 Performance"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
          <h2 className="font-display text-3xl tracking-wide uppercase">
            {trainingCopy.semiPrivate.title}
          </h2>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted">
            {trainingCopy.semiPrivate.points.map((point) => (
              <li key={point}>• {point}</li>
            ))}
          </ul>
          <div className="mt-6">
            <ButtonLink href={siteConfig.booking.path}>Book NOW</ButtonLink>
          </div>
        </article>

        <article className="border border-border bg-surface p-6">
          <div className="relative mb-6 overflow-hidden">
            <PosterVideo
              videoSrc={trainingCopy.smallGroup.video.src}
              posterSrc={trainingCopy.smallGroup.video.posterSrc}
              title={trainingCopy.smallGroup.video.title}
            />
          </div>
          <h2 className="font-display text-3xl tracking-wide uppercase">
            {trainingCopy.smallGroup.title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {trainingCopy.smallGroup.intro}
          </p>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted">
            {trainingCopy.smallGroup.points.map((point) => (
              <li key={point}>• {point}</li>
            ))}
          </ul>
          <div className="mt-6">
            <ButtonLink href={siteConfig.booking.path}>Book NOW</ButtonLink>
          </div>
        </article>
      </div>

      <TrainingPricingSection />

      <section className="mt-12 grid gap-8 border border-border bg-surface p-6 sm:p-8 lg:grid-cols-2 lg:items-center">
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src="/images/home/schedule-assessment.png"
            alt="Fitness assessment tools including measuring tape, stopwatch, notebook, and training gear"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 40vw"
          />
        </div>
        <div>
          <h2 className="font-display text-3xl tracking-wide uppercase">
            {trainingCopy.assessment.title}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
            {trainingCopy.assessment.body}
          </p>
          <div className="mt-6">
            <ButtonLink href={siteConfig.booking.path}>Schedule Now</ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}
