import { ButtonLink } from "@/components/shared/button-link";
import { SectionHeading } from "@/components/shared/section-heading";
import { TransformationGallery } from "@/components/transformations/transformation-gallery";
import { siteConfig } from "@/content/site-config";
import { featuredTransformations } from "@/content/transformations";
import { testimonials } from "@/content/testimonials";

export function ResultsSection() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Results"
          title="Transformations"
          description={`“${siteConfig.tagline}” Real client progress from coaching at MA5.`}
        />

        <TransformationGallery
          items={featuredTransformations}
          className="mt-12"
        />

        <div className="mt-8">
          <ButtonLink href="/transformations" variant="secondary">
            View all transformations
          </ButtonLink>
        </div>

        {testimonials.length > 0 ? (
          <div className="mt-16 grid gap-6 md:grid-cols-2">
            {testimonials.map((item) => (
              <blockquote
                key={item.id}
                className="border border-border bg-surface p-6"
              >
                <p className="text-lg leading-relaxed text-foreground">
                  “{item.quote}”
                </p>
                <footer className="mt-4 text-sm text-muted">
                  — {item.attribution}
                </footer>
              </blockquote>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
