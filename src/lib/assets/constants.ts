export const BRAND_ASSETS_BUCKET = "ma5-brand-assets";
export const MAX_IMAGE_BYTES = 5_242_880; // 5MB
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export function isAllowedImageType(type: string): boolean {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type);
}

export function publicAssetUrl(path: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base || !path) return null;
  return `${base}/storage/v1/object/public/${BRAND_ASSETS_BUCKET}/${path}`;
}
