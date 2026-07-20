import type { MarketingGallerySection } from "@/features/marketing-gallery/types";

export function marketingGalleryPath(
  section: MarketingGallerySection,
  fileId: string,
) {
  return `marketing/${section}/${fileId}.jpg`;
}
