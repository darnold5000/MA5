import type { Metadata } from "next";

import { MarketingGalleryManager } from "@/components/admin/marketing-gallery-manager";
import { MarketingSubnav } from "@/components/marketing/marketing-subnav";
import { listMarketingGalleryWithStatus } from "@/features/marketing-gallery/queries";

export const metadata: Metadata = {
  title: "Website content · Growth",
  robots: { index: false, follow: false },
};

export default async function AdminMarketingContentPage() {
  const [transformationsResult, communityResult] = await Promise.all([
    listMarketingGalleryWithStatus("transformations"),
    listMarketingGalleryWithStatus("community"),
  ]);
  const galleryWarning =
    transformationsResult.error ?? communityResult.error ?? null;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Growth
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide uppercase">
          Website content
        </h1>
        <p className="mt-2 text-sm text-muted">
          Upload and remove photos for the Results gallery and Our Community
          page. For Community, choose which section each photo sits next to
          (Hero, Gatlinburg, Father&apos;s Heart, etc.).
        </p>
      </div>

      <MarketingSubnav />

      {galleryWarning ? (
        <p className="border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Gallery load failed: {galleryWarning}
        </p>
      ) : null}

      <MarketingGalleryManager
        section="transformations"
        title="Transformations"
        description="Photos appear on /transformations and can be featured on the home page."
        initialItems={transformationsResult.items}
        showClientName
        showFeatured
      />

      <MarketingGalleryManager
        section="community"
        title="Our Community"
        description="Upload a photo and choose which section it appears next to on /our-community (Hero, Gatlinburg, Father's Heart, and so on). Replacing a slot overwrites the previous photo for that section when you assign the same placement."
        initialItems={communityResult.items}
        showPlacement
      />
    </div>
  );
}
