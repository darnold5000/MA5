import Image from "next/image";

import { ButtonLink } from "@/components/shared/button-link";
import { SectionHeading } from "@/components/shared/section-heading";
import { trainingCopy } from "@/content/services";

export function AssessmentSection() {
  return (
    <section className="border-y border-border bg-surface px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center">
        <div className="relative aspect-[4/3] overflow-hidden border border-border">
          <Image
            src="/images/home/schedule-assessment.png"
            alt="Fitness assessment tools including measuring tape, stopwatch, notebook, and training gear"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
        <div>
          <SectionHeading
            eyebrow="Get Started"
            title="Schedule an Assessment"
            description={trainingCopy.assessment.body}
          />
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Not sure whether semi-private or small-group training is the right
            fit? Start here. Your assessment gives us the baseline to build a
            program around your goals.
          </p>
          <div className="mt-8">
            <ButtonLink href="/book?type=assessment">
              Schedule an Assessment
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
