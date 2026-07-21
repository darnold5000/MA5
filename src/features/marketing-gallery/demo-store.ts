import { cookies } from "next/headers";

import type { CommunityPlacementId } from "@/content/community";
import type {
  MarketingGalleryItem,
  MarketingGallerySection,
} from "@/features/marketing-gallery/types";

export const MARKETING_GALLERY_COOKIE = "ma5_marketing_gallery";

type DemoGalleryStore = Record<MarketingGallerySection, MarketingGalleryItem[]>;

function emptyStore(): DemoGalleryStore {
  return { transformations: [], community: [] };
}

function normalizeItem(item: MarketingGalleryItem): MarketingGalleryItem {
  return {
    ...item,
    placement: item.placement ?? null,
  };
}

export function parseMarketingGalleryStore(
  raw: string | undefined,
): DemoGalleryStore {
  if (!raw) return emptyStore();
  try {
    const parsed = JSON.parse(raw) as DemoGalleryStore;
    return {
      transformations: Array.isArray(parsed.transformations)
        ? parsed.transformations.map(normalizeItem)
        : [],
      community: Array.isArray(parsed.community)
        ? parsed.community.map(normalizeItem)
        : [],
    };
  } catch {
    return emptyStore();
  }
}

export function serializeMarketingGalleryStore(store: DemoGalleryStore): string {
  return JSON.stringify(store);
}

export async function readMarketingGalleryDemoStore(): Promise<DemoGalleryStore> {
  const jar = await cookies();
  return parseMarketingGalleryStore(jar.get(MARKETING_GALLERY_COOKIE)?.value);
}

export function demoGalleryItem(input: {
  section: MarketingGallerySection;
  imageUrl: string;
  altText?: string;
  clientName?: string | null;
  featured?: boolean;
  placement?: CommunityPlacementId | null;
}): MarketingGalleryItem {
  return {
    id: crypto.randomUUID(),
    section: input.section,
    storagePath: `demo:${input.imageUrl}`,
    imageUrl: input.imageUrl,
    altText: input.altText ?? "",
    clientName: input.clientName ?? null,
    placement: input.placement ?? null,
    sortOrder: 0,
    featured: input.featured ?? false,
    createdAt: new Date().toISOString(),
  };
}
