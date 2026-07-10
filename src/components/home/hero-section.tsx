import Image from "next/image";

import { ButtonLink } from "@/components/shared/button-link";
import { siteConfig } from "@/content/site-config";

export function HeroSection() {
  return (
    <section className="relative isolate min-h-[88vh] overflow-hidden">
      <Image
        src="/images/hero/fitness-room.jpg"
        alt="Training floor at MA5 Performance"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/35" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/30" />

      <div className="relative mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-end px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-4">
          <Image
            src="/images/brand/ma5-logo.jpeg"
            alt="MA5 Performance logo"
            width={72}
            height={72}
            className="h-16 w-16 rounded-full object-cover sm:h-[72px] sm:w-[72px]"
          />
          <p className="text-xs font-semibold tracking-[0.24em] text-brand uppercase">
            {siteConfig.location.city}, {siteConfig.location.state}
          </p>
        </div>
        <h1 className="max-w-4xl font-display text-5xl leading-[0.92] tracking-wide uppercase sm:text-6xl lg:text-7xl">
          Train With Purpose.
          <br />
          Perform With Confidence.
        </h1>
        <p className="mt-4 max-w-xl text-sm font-medium tracking-wide text-brand uppercase">
          {siteConfig.tagline}
        </p>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
          {siteConfig.description}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/book?type=assessment">Book an Assessment</ButtonLink>
          <ButtonLink href="/training" variant="secondary">
            Explore Training
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
