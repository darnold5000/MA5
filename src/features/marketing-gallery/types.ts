export type MarketingGallerySection = "transformations" | "community";

export type MarketingGalleryItem = {
  id: string;
  section: MarketingGallerySection;
  storagePath: string;
  imageUrl: string;
  altText: string;
  clientName: string | null;
  sortOrder: number;
  featured: boolean;
  createdAt: string;
};
