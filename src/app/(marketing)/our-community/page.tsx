import type { Metadata } from "next";

import { CommunityGallery } from "@/components/marketing/community-gallery";
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
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
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
        <CommunityGallery
          items={communityPhotos}
          fallbackImage={{
            src: communityCopy.imageSrc,
            alt: communityCopy.imageAlt,
          }}
        />
      </div>
    </div>
  );
}
