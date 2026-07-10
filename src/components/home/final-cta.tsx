import { ButtonLink } from "@/components/shared/button-link";

export function FinalCta() {
  return (
    <section className="border-t border-border bg-surface-strong px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-display text-4xl tracking-wide uppercase sm:text-5xl">
          Ready to Get Started?
        </h2>
        <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg">
          Book your assessment and take the first step toward a stronger,
          healthier, more confident you.
        </p>
        <div className="mt-8 flex justify-center">
          <ButtonLink href="/book">Book Now</ButtonLink>
        </div>
      </div>
    </section>
  );
}
