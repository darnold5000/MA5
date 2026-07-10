import type { Metadata } from "next";
import Image from "next/image";

import { ButtonLink } from "@/components/shared/button-link";
import { SectionHeading } from "@/components/shared/section-heading";
import { inbodyPricing } from "@/content/services";

export const metadata: Metadata = {
  title: "InBody Scan",
  description:
    "InBody body composition scans and consultations at MA5 Performance in Avon, Indiana.",
};

export default function InBodyPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-start">
        <div>
          <SectionHeading
            eyebrow="Body Composition"
            title="InBody Scan Pricing"
            description="Know your biometrics so you can build a plan around fat percentage, metabolic rate, water retention, and muscle distribution."
          />
          <div className="mt-10 space-y-4">
            {inbodyPricing.map((item) => (
              <article
                key={item.name}
                className="border border-border bg-surface p-6"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="font-display text-2xl tracking-wide uppercase">
                    {item.name}
                  </h2>
                  <p className="text-2xl font-semibold text-brand">{item.price}</p>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
          <div className="mt-8">
            <ButtonLink href="/book?type=inbody">
              Schedule your InBody Scan Today
            </ButtonLink>
          </div>
        </div>
        <div className="relative aspect-[3/4] overflow-hidden border border-border">
          <Image
            src="/images/services/inbody.jpg"
            alt="InBody scan at MA5 Performance"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 40vw"
          />
        </div>
      </div>
    </div>
  );
}
