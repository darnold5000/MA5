import type { Metadata } from "next";
import Image from "next/image";

import { CommunityPhotoGrid } from "@/components/marketing/community-gallery";
import { ButtonLink } from "@/components/shared/button-link";
import { SectionHeading } from "@/components/shared/section-heading";
import { getBookingHref } from "@/content/booking";
import { communityCopy } from "@/content/services";
import { listMarketingGallery } from "@/features/marketing-gallery/queries";

export const metadata: Metadata = {
  title: "Our Community",
  description:
    "MA5 Performance is more than a gym — it's a supportive community built on meaningful relationships, events, and shared goals in Avon, Indiana.",
};

export default async function OurCommunityPage() {
  const communityPhotos = await listMarketingGallery("community");

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <SectionHeading
            eyebrow="Our Community"
            title={communityCopy.headline}
            description={communityCopy.body}
          />
          <div className="mt-8">
            <ButtonLink href={getBookingHref("assessment")}>
              Join Our Community
            </ButtonLink>
          </div>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden border border-border">
          <Image
            src={communityCopy.imageSrc}
            alt={communityCopy.imageAlt}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 40vw"
            priority
          />
        </div>
      </div>

      {communityPhotos.length > 0 ? (
        <section className="mt-16 border-t border-border pt-12">
          <h2 className="font-display text-2xl tracking-wide uppercase sm:text-3xl">
            Community moments
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Tap a photo to view it larger.
          </p>
          <CommunityPhotoGrid items={communityPhotos} className="mt-8" />
        </section>
      ) : null}
    </div>
  );
}
