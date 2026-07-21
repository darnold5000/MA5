import {
  readMarketingGalleryDemoStore,
  serializeMarketingGalleryStore,
} from "@/features/marketing-gallery/demo-store";
import type {
  MarketingGalleryItem,
  MarketingGallerySection,
} from "@/features/marketing-gallery/types";
import type { CommunityPlacementId } from "@/content/community";
import { publicAssetUrl } from "@/lib/assets/constants";
import { isSupabasePublicConfigured } from "@/lib/env";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

type GalleryRow = {
  id: string;
  section: MarketingGallerySection;
  storage_path: string;
  alt_text: string;
  client_name: string | null;
  placement: CommunityPlacementId | null;
  sort_order: number;
  featured: boolean;
  created_at: string;
};

function mapRow(row: GalleryRow): MarketingGalleryItem {
  const imageUrl =
    row.storage_path.startsWith("demo:") || row.storage_path.startsWith("http")
      ? row.storage_path.replace(/^demo:/, "")
      : publicAssetUrl(row.storage_path) ?? row.storage_path;

  return {
    id: row.id,
    section: row.section,
    storagePath: row.storage_path,
    imageUrl,
    altText: row.alt_text,
    clientName: row.client_name,
    placement: row.placement ?? null,
    sortOrder: row.sort_order,
    featured: row.featured,
    createdAt: row.created_at,
  };
}

export async function listMarketingGallery(
  section: MarketingGallerySection,
): Promise<MarketingGalleryItem[]> {
  if (!isSupabasePublicConfigured() || !isSupabaseConfigured()) {
    const store = await readMarketingGalleryDemoStore();
    return store[section];
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(MA5_TABLES.marketingGallery)
      .select("*")
      .eq("section", section)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as GalleryRow[]).map(mapRow);
  } catch {
    const store = await readMarketingGalleryDemoStore();
    return store[section];
  }
}

export async function createMarketingGalleryItem(input: {
  section: MarketingGallerySection;
  storagePath: string;
  altText?: string;
  clientName?: string | null;
  featured?: boolean;
  placement?: CommunityPlacementId | null;
}): Promise<MarketingGalleryItem> {
  if (!isSupabasePublicConfigured() || !isSupabaseConfigured()) {
    const store = await readMarketingGalleryDemoStore();
    const item: MarketingGalleryItem = {
      id: crypto.randomUUID(),
      section: input.section,
      storagePath: input.storagePath,
      imageUrl: input.storagePath.startsWith("demo:")
        ? input.storagePath.replace(/^demo:/, "")
        : input.storagePath,
      altText: input.altText ?? "",
      clientName: input.clientName ?? null,
      placement: input.placement ?? null,
      sortOrder: store[input.section].length,
      featured: input.featured ?? false,
      createdAt: new Date().toISOString(),
    };
    return item;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(MA5_TABLES.marketingGallery)
    .insert({
      section: input.section,
      storage_path: input.storagePath,
      alt_text: input.altText ?? "",
      client_name: input.clientName ?? null,
      featured: input.featured ?? false,
      placement: input.placement ?? null,
      sort_order: 0,
    })
    .select("*")
    .single();

  if (error) throw error;
  const item = mapRow(data as GalleryRow);
  if (!item.imageUrl && item.storagePath) {
    item.imageUrl = publicAssetUrl(item.storagePath) ?? item.storagePath;
  }
  return item;
}

export async function updateMarketingGalleryItem(input: {
  id: string;
  placement?: CommunityPlacementId | null;
  featured?: boolean;
  clientName?: string | null;
  altText?: string;
}): Promise<MarketingGalleryItem | null> {
  if (!isSupabasePublicConfigured() || !isSupabaseConfigured()) {
    const store = await readMarketingGalleryDemoStore();
    for (const section of ["transformations", "community"] as const) {
      const index = store[section].findIndex((item) => item.id === input.id);
      if (index < 0) continue;
      const current = store[section][index]!;
      const updated: MarketingGalleryItem = {
        ...current,
        placement:
          input.placement !== undefined ? input.placement : current.placement,
        featured: input.featured !== undefined ? input.featured : current.featured,
        clientName:
          input.clientName !== undefined ? input.clientName : current.clientName,
        altText: input.altText !== undefined ? input.altText : current.altText,
      };
      store[section][index] = updated;
      return updated;
    }
    return null;
  }

  const patch: Record<string, unknown> = {};
  if (input.placement !== undefined) patch.placement = input.placement;
  if (input.featured !== undefined) patch.featured = input.featured;
  if (input.clientName !== undefined) patch.client_name = input.clientName;
  if (input.altText !== undefined) patch.alt_text = input.altText;

  if (Object.keys(patch).length === 0) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(MA5_TABLES.marketingGallery)
    .update(patch)
    .eq("id", input.id)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapRow(data as GalleryRow);
}

export async function deleteMarketingGalleryItem(id: string): Promise<{
  storagePath: string | null;
}> {
  if (!isSupabasePublicConfigured() || !isSupabaseConfigured()) {
    const store = await readMarketingGalleryDemoStore();
    for (const section of ["transformations", "community"] as const) {
      const index = store[section].findIndex((item) => item.id === id);
      if (index >= 0) {
        const [removed] = store[section].splice(index, 1);
        return { storagePath: removed?.storagePath ?? null };
      }
    }
    return { storagePath: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(MA5_TABLES.marketingGallery)
    .delete()
    .eq("id", id)
    .select("storage_path")
    .maybeSingle();

  if (error) throw error;
  return { storagePath: (data as { storage_path: string } | null)?.storage_path ?? null };
}

export function marketingGalleryCookieValue(
  store: Awaited<ReturnType<typeof readMarketingGalleryDemoStore>>,
) {
  return serializeMarketingGalleryStore(store);
}
