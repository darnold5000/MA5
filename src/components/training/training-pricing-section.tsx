import { ButtonLink } from "@/components/shared/button-link";
import { SectionHeading } from "@/components/shared/section-heading";
import { siteConfig } from "@/content/site-config";
import { listActiveOfferings } from "@/lib/billing/catalog";
import { formatMoney } from "@/features/scheduling/format";

export async function TrainingPricingSection() {
  const offerings = await listActiveOfferings();

  const groups = new Map<string, typeof offerings>();
  for (const offering of offerings) {
    const key = offering.category || offering.productType;
    const list = groups.get(key) ?? [];
    list.push(offering);
    groups.set(key, list);
  }

  const ordered = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <section className="mt-16">
      <SectionHeading
        eyebrow="Pricing"
        title="Training Options & Pricing"
        description="Current packages from the MA5 catalog. Prices can change — confirm the latest options when you book."
      />

      <div className="mt-10 space-y-10">
        {ordered.length === 0 ? (
          <p className="text-sm text-muted">
            Pricing will appear here once offerings are published in the admin
            catalog.
          </p>
        ) : (
          ordered.map(([category, items]) => (
            <div key={category}>
              <h3 className="font-display text-2xl tracking-wide uppercase">
                {category.replace(/_/g, " ")}
              </h3>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {items.map((item) => (
                  <article
                    key={item.id}
                    className="border border-border bg-surface p-5"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <h4 className="text-base font-semibold tracking-wide text-foreground">
                        {item.name}
                      </h4>
                      <p className="text-xl font-semibold text-brand">
                        {formatMoney(item.priceCents)}
                        {item.paymentType === "subscription" ? (
                          <span className="ml-1 text-sm font-medium text-muted">
                            / month
                          </span>
                        ) : null}
                      </p>
                    </div>
                    {item.description ? (
                      <p className="mt-2 text-sm leading-relaxed text-muted">
                        {item.description}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-8">
        <ButtonLink href={siteConfig.booking.path}>Book Now</ButtonLink>
      </div>
    </section>
  );
}
