import { SectionHeading } from "@/components/shared/section-heading";
import { siteConfig } from "@/content/site-config";
import { testimonials } from "@/content/testimonials";

export function ResultsSection() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Results"
          title="Transformations and Testimonials"
          description={`“${siteConfig.tagline}” Client stories will appear here once MA5 provides approved quotes and transformation photos.`}
        />

        {testimonials.length > 0 ? (
          <div className="mt-12 grid gap-6 md:grid-cols-2">
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
        ) : (
          <div className="mt-12 border border-dashed border-border bg-surface p-8">
            <p className="text-sm leading-relaxed text-muted">
              No public testimonials are published on the current MA5 website.
              This section stays empty until verified client content is
              available.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
