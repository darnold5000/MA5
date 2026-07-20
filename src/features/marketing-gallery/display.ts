import type { Transformation } from "@/content/transformations";
import type { MarketingGalleryItem } from "@/features/marketing-gallery/types";

export function galleryItemsToTransformations(
  items: MarketingGalleryItem[],
): Transformation[] {
  return items.map((item) => ({
    id: item.id,
    src: item.imageUrl,
    alt: item.altText || "Client transformation at MA5 Performance",
    clientName: item.clientName ?? undefined,
  }));
}

export function mergeTransformations(
  uploaded: MarketingGalleryItem[],
  staticItems: Transformation[],
): Transformation[] {
  const uploadedCards = galleryItemsToTransformations(uploaded);
  if (uploadedCards.length === 0) return staticItems;
  return [...uploadedCards, ...staticItems];
}

export function featuredTransformationsFromGallery(
  uploaded: MarketingGalleryItem[],
  staticFeatured: Transformation[],
): Transformation[] {
  const featuredUploaded = uploaded.filter((item) => item.featured);
  const uploadedCards = galleryItemsToTransformations(featuredUploaded);
  if (uploadedCards.length > 0) return uploadedCards;
  return staticFeatured;
}
