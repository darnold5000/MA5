import { CommunityEventIconMark } from "@/components/marketing/community-icons";
import { CommunitySectionImage } from "@/components/marketing/community-section-image";
import type { CommunityEventSection } from "@/content/community";
import { cn } from "@/lib/utils";

type CommunityEventBlockProps = {
  section: CommunityEventSection;
  imageSrc?: string | null;
  imageAlt?: string;
};

export function CommunityEventBlock({
  section,
  imageSrc,
  imageAlt,
}: CommunityEventBlockProps) {
  const image = (
    <CommunitySectionImage
      src={imageSrc}
      alt={imageAlt || `${section.title} at MA5 Performance`}
      placeholderLabel={section.title}
    />
  );

  const copy = (
    <div className="flex flex-col justify-center">
      <CommunityEventIconMark name={section.icon} />
      <p className="mt-5 text-xs font-semibold tracking-[0.22em] text-foreground uppercase">
        {section.eyebrow}
      </p>
      <h2 className="mt-2 font-display text-3xl tracking-wide text-brand uppercase sm:text-4xl">
        {section.title}
      </h2>
      <p className="mt-4 font-display text-lg tracking-wide text-foreground uppercase sm:text-xl">
        {section.tagline}
      </p>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
        {section.body}
      </p>
    </div>
  );

  return (
    <section className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
      <div
        className={cn(
          section.imageSide === "left" ? "lg:order-1" : "lg:order-2",
        )}
      >
        {image}
      </div>
      <div
        className={cn(
          section.imageSide === "left" ? "lg:order-2" : "lg:order-1",
        )}
      >
        {copy}
      </div>
    </section>
  );
}
