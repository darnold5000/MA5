import type { Metadata } from "next";

import { CommunityCta } from "@/components/marketing/community-cta";
import { CommunityEventBlock } from "@/components/marketing/community-event-block";
import { CommunityHero } from "@/components/marketing/community-hero";
import {
  communityEventSections,
  type CommunityPlacementId,
} from "@/content/community";
import { listMarketingGallery } from "@/features/marketing-gallery/queries";
import type { MarketingGalleryItem } from "@/features/marketing-gallery/types";

export const metadata: Metadata = {
  title: "Our Community",
  description:
    "MA5 Performance is more than a gym — it's a supportive community built on meaningful relationships, events, and shared goals in Avon, Indiana.",
};

function photoForPlacement(
  items: MarketingGalleryItem[],
  placement: CommunityPlacementId,
): MarketingGalleryItem | undefined {
  return items.find((item) => item.placement === placement);
}

export default async function OurCommunityPage() {
  const communityPhotos = await listMarketingGallery("community");
  const heroPhoto = photoForPlacement(communityPhotos, "hero");

  return (
    <>
      <CommunityHero
        imageSrc={heroPhoto?.imageUrl}
        imageAlt={heroPhoto?.altText}
      />

      <div className="mx-auto max-w-7xl space-y-20 px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        {communityEventSections.map((section) => {
          const photo = photoForPlacement(communityPhotos, section.id);
          return (
            <CommunityEventBlock
              key={section.id}
              section={section}
              imageSrc={photo?.imageUrl}
              imageAlt={photo?.altText}
            />
          );
        })}
      </div>

      <CommunityCta />
    </>
  );
}
