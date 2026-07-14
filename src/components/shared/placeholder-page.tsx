import { ButtonLink } from "@/components/shared/button-link";
import { SectionHeading } from "@/components/shared/section-heading";
import { siteConfig } from "@/content/site-config";

type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
      <SectionHeading title={title} description={description} />
      <p className="mt-6 text-sm text-muted">
        {/* TODO: Replace this placeholder with approved MA5 page content. */}
        Full page content will be added in Phase 2 once discovery assets and
        verified copy are available.
      </p>
      <div className="mt-8">
        <ButtonLink href={siteConfig.booking.path}>Book Now</ButtonLink>
      </div>
    </section>
  );
}
