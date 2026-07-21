import type { CommunityPlacementId } from "@/content/community";

export type MarketingGallerySection = "transformations" | "community";

export type MarketingGalleryItem = {
  id: string;
  section: MarketingGallerySection;
  storagePath: string;
  imageUrl: string;
  altText: string;
  clientName: string | null;
  /** Our Community page slot; null for transformations or unassigned. */
  placement: CommunityPlacementId | null;
  sortOrder: number;
  featured: boolean;
  createdAt: string;
};
