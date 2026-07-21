import { CommunitySectionImage } from "@/components/marketing/community-section-image";
import { ButtonLink } from "@/components/shared/button-link";
import { getBookingHref } from "@/content/booking";
import { communityHeroCopy } from "@/content/community";

type CommunityHeroProps = {
  imageSrc?: string | null;
  imageAlt?: string;
};

export function CommunityHero({ imageSrc, imageAlt }: CommunityHeroProps) {
  const src = imageSrc || communityHeroCopy.fallbackImageSrc;
  const alt = imageAlt || communityHeroCopy.fallbackImageAlt;

  return (
    <section className="relative isolate min-h-[70vh] overflow-hidden bg-background sm:min-h-[78vh]">
      <div className="absolute inset-0">
        <CommunitySectionImage
          src={src}
          alt={alt}
          placeholderLabel="Hero"
          framed={false}
          priority
          className="absolute inset-0 min-h-[70vh] border-0 sm:min-h-[78vh]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
      </div>

      <div className="relative mx-auto flex min-h-[70vh] max-w-7xl flex-col justify-center px-4 py-24 sm:min-h-[78vh] sm:px-6 lg:px-8">
        <div className="max-w-xl">
          <p className="text-xs font-semibold tracking-[0.22em] text-brand uppercase">
            {communityHeroCopy.eyebrow}
          </p>
          <h1 className="mt-4 font-display text-4xl leading-[0.95] tracking-wide text-white uppercase sm:text-5xl lg:text-6xl">
            {communityHeroCopy.title}
          </h1>
          <p className="mt-6 text-sm leading-relaxed text-white/90 sm:text-base">
            {communityHeroCopy.body}
          </p>
          <div className="mt-8">
            <ButtonLink href={getBookingHref("assessment")}>
              {communityHeroCopy.cta}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
