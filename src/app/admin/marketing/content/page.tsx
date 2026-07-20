import type { Metadata } from "next";

import { MarketingGalleryManager } from "@/components/admin/marketing-gallery-manager";
import { MarketingSubnav } from "@/components/marketing/marketing-subnav";
import {
  listMarketingGallery,
} from "@/features/marketing-gallery/queries";

export const metadata: Metadata = {
  title: "Website content · Growth",
  robots: { index: false, follow: false },
};

export default async function AdminMarketingContentPage() {
  const [transformations, community] = await Promise.all([
    listMarketingGallery("transformations"),
    listMarketingGallery("community"),
  ]);

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
          page. Built-in gallery images in the codebase still appear until you
          add uploads.
        </p>
      </div>

      <MarketingSubnav />

      <MarketingGalleryManager
        section="transformations"
        title="Transformations"
        description="Photos appear on /transformations and can be featured on the home page."
        initialItems={transformations}
        showClientName
        showFeatured
      />

      <MarketingGalleryManager
        section="community"
        title="Our Community"
        description="Photos appear in a gallery on /our-community."
        initialItems={community}
      />
    </div>
  );
}
