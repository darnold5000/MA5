import type { Metadata } from "next";
import Image from "next/image";

import { ButtonLink } from "@/components/shared/button-link";
import { SectionHeading } from "@/components/shared/section-heading";
import { openGymCopy } from "@/content/services";
import { siteConfig } from "@/content/site-config";

export const metadata: Metadata = {
  title: "Open Gym",
  description:
    "24/7 private open-gym access with key-fob entry and the MA5 training app in Avon, Indiana.",
};

export default function OpenGymPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <SectionHeading
            eyebrow="Open Gym"
            title="Private 24/7 Gym Access"
            description={openGymCopy.intro}
          />
          <ul className="mt-8 space-y-3 text-sm leading-relaxed text-muted">
            {openGymCopy.perks.map((perk) => (
              <li key={perk} className="border-l-2 border-brand pl-4">
                {perk}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/book?type=open-gym">Sign up today</ButtonLink>
            <ButtonLink
              href={`mailto:${siteConfig.contact.email}?subject=Open%20Gym%20Sign%20up`}
              variant="secondary"
            >
              Email to join
            </ButtonLink>
          </div>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden border border-border">
          <Image
            src="/images/facility/open-gym.jpg"
            alt="MA5 private open gym"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
      </div>
    </div>
  );
}
