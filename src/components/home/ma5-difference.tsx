import { SectionHeading } from "@/components/shared/section-heading";
import { fitnessPillars } from "@/content/services";

export function Ma5Difference() {
  return (
    <section className="border-y border-border bg-surface px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="The MA5 Difference"
          title="Five Components of Fitness"
          description="We build training around the fundamentals that create lasting strength, capacity, and confidence."
        />
        <ol className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
          {fitnessPillars.map((pillar, index) => (
            <li key={pillar.title} className="border border-border bg-background p-5">
              <p className="font-display text-3xl text-brand">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-4 font-display text-xl tracking-wide uppercase">
                {pillar.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {pillar.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
