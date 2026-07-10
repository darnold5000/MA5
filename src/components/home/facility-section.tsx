import Image from "next/image";

import { ButtonLink } from "@/components/shared/button-link";
import { SectionHeading } from "@/components/shared/section-heading";

export function FacilitySection() {
  return (
    <section className="border-y border-border bg-surface px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <SectionHeading
            eyebrow="Facility"
            title="Train in a Focused Private Environment"
            description="Private open-gym access, essential strength and cardio equipment, InBody testing, and infrared sauna recovery — without the distractions of a crowded commercial gym."
          />
          <div className="mt-8">
            <ButtonLink href="/facility">Tour MA5</ButtonLink>
          </div>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden border border-border">
          <Image
            src="/images/facility/open-gym.jpg"
            alt="MA5 Performance open gym floor"
            fill
            sizes="(max-width: 1024px) 100vw, 40vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
