import Image from "next/image";

import { ButtonLink } from "@/components/shared/button-link";
import { getBookingHref } from "@/content/booking";

const heroServices = [
  "Personal Training",
  "Sports Performance",
  "Nutrition Coaching",
  "Infrared Sauna",
  "24/7 Gym Access",
] as const;

export function HeroSection() {
  return (
    <section className="relative isolate min-h-[88vh] overflow-hidden bg-background">
      <div className="absolute inset-0">
        <Image
          src="/images/hero/gym-hero.png"
          alt="Training floor at MA5 Performance"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center brightness-110"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/35 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-black/15" />
      </div>

      <div className="relative mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-end px-4 pb-14 pt-28 sm:px-6 sm:pb-16 lg:px-8">
        <h1 className="max-w-3xl font-display text-[2.35rem] leading-[0.95] tracking-wide uppercase sm:text-5xl lg:text-6xl">
          <span className="text-brand">Real</span>{" "}
          <span className="text-white">Coaching.</span>
          <br />
          <span className="text-brand">Proven</span>{" "}
          <span className="text-white">Results.</span>
          <br />
          <span className="text-white">A</span>{" "}
          <span className="text-brand">Community</span>
          <br />
          <span className="text-white">That Pushes</span>
          <br />
          <span className="text-white">You</span>{" "}
          <span className="text-brand">Further.</span>
        </h1>

        <div className="mt-6 h-0.5 w-12 bg-brand" aria-hidden />

        <p className="mt-6 max-w-2xl text-[0.7rem] font-semibold tracking-[0.16em] text-white uppercase sm:text-xs sm:tracking-[0.2em]">
          {heroServices.map((service, index) => (
            <span key={service}>
              {index > 0 ? (
                <span className="px-2 text-brand" aria-hidden>
                  •
                </span>
              ) : null}
              {service}
            </span>
          ))}
        </p>

        <div className="mt-8 max-w-xl">
          <ButtonLink
            href={getBookingHref("assessment")}
            className="w-full px-8 py-4 text-sm sm:w-auto"
          >
            Book Your Free Consultation →
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
