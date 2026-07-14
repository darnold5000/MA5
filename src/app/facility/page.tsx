import type { Metadata } from "next";
import Image from "next/image";

import { ButtonLink } from "@/components/shared/button-link";
import { SectionHeading } from "@/components/shared/section-heading";
import { siteConfig } from "@/content/site-config";

export const metadata: Metadata = {
  title: "Facility",
  description:
    "Tour the MA5 Performance facility in Avon, Indiana — private open gym, training space, InBody, and infrared sauna.",
};

const gallery = [
  {
    src: "/images/facility/open-gym.jpg",
    alt: "MA5 open gym training floor",
  },
  {
    src: "/images/facility/facility-1.jpeg",
    alt: "Outdoor sports performance training with MA5",
  },
  {
    src: "/images/hero/fitness-room.jpg",
    alt: "Strength training environment",
  },
  {
    src: "/images/services/inbody.jpg",
    alt: "InBody assessment area",
  },
];

export default function FacilityPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Tour MA5"
        title="Our Facility"
        description="A private training environment with the equipment and recovery tools you need — without the overcrowded commercial-gym experience."
      />

      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {gallery.map((image) => (
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

      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href={siteConfig.booking.path}>Join our community today</ButtonLink>
        <ButtonLink href="/open-gym" variant="secondary">
          Learn about Open Gym
        </ButtonLink>
      </div>
    </div>
  );
}
