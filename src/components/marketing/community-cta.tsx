import { ButtonLink } from "@/components/shared/button-link";
import { getBookingHref } from "@/content/booking";
import { communityCtaCopy } from "@/content/community";

export function CommunityCta() {
  return (
    <section className="border-t border-border px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <div className="flex items-center justify-center gap-4">
          <span className="hidden h-px w-16 bg-brand sm:block" aria-hidden />
          <h2 className="font-display text-3xl tracking-wide text-white uppercase sm:text-4xl">
            {communityCtaCopy.title}
          </h2>
          <span className="hidden h-px w-16 bg-brand sm:block" aria-hidden />
        </div>
        <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg">
          {communityCtaCopy.body}
        </p>
        <div className="mt-8 flex justify-center">
          <ButtonLink href={getBookingHref("assessment")}>
            {communityCtaCopy.cta}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
