import type { Metadata } from "next";
import Image from "next/image";

import { ButtonLink } from "@/components/shared/button-link";
import { SectionHeading } from "@/components/shared/section-heading";
import { nutritionCopy } from "@/content/services";
import { siteConfig } from "@/content/site-config";

export const metadata: Metadata = {
  title: "Nutrition",
  description:
    "Sustainable nutrition coaching and individualized meal planning at MA5 Performance in Avon, Indiana.",
};

export default function NutritionPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <SectionHeading
            eyebrow="Nutrition"
            title="Customized Meal Plans"
            description={nutritionCopy.intro}
          />
          <ul className="mt-8 space-y-3 text-sm leading-relaxed text-muted">
            {nutritionCopy.points.map((point) => (
              <li key={point}>• {point}</li>
            ))}
          </ul>
          <p className="mt-6 text-sm font-medium text-foreground">
            Let&apos;s start eating to live, not living to eat.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/book">Schedule Nutrition Consultation</ButtonLink>
            <ButtonLink
              href={`mailto:${siteConfig.contact.email}?subject=Nutrition%20Consultation`}
              variant="secondary"
            >
              Email MA5
            </ButtonLink>
          </div>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden border border-border">
          <Image
            src="/images/services/nutrition.png"
            alt="Nutrition coaching at MA5 Performance"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
      </div>
    </div>
  );
}
