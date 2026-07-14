import { ButtonLink } from "@/components/shared/button-link";
import { SectionHeading } from "@/components/shared/section-heading";
import { trainingPricingGroups } from "@/content/pricing";
import { siteConfig } from "@/content/site-config";

export function TrainingPricingSection() {
  return (
    <section className="mt-16">
      <SectionHeading
        eyebrow="Pricing"
        title="Training Options & Pricing"
        description="Current packages from Mindbody. Prices can change — confirm the latest options when you book."
      />

      <div className="mt-10 space-y-10">
        {trainingPricingGroups.map((group) => (
          <div key={group.id}>
            <h3 className="font-display text-2xl tracking-wide uppercase">
              {group.title}
            </h3>
            {group.description ? (
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
                {group.description}
              </p>
            ) : null}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {group.items.map((item) => (
                <article
                  key={item.id}
                  className="border border-border bg-surface p-5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h4 className="text-base font-semibold tracking-wide text-foreground">
                      {item.name}
                    </h4>
                    <p className="text-xl font-semibold text-brand">
                      {item.price}
                      {item.cadence ? (
                        <span className="ml-1 text-sm font-medium text-muted">
                          {item.cadence}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  {item.detail ? (
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {item.detail}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <ButtonLink href={siteConfig.booking.path}>Book Now</ButtonLink>
      </div>
    </section>
  );
}
