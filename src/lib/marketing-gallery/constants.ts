import type { MarketingGallerySection } from "@/features/marketing-gallery/types";
import { brandMarketingGalleryPath } from "@/lib/tenant/storage-paths";

export function marketingGalleryPath(
  section: MarketingGallerySection,
  fileId: string,
) {
  return brandMarketingGalleryPath(section, fileId);
}
