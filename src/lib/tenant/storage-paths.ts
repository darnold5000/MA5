/**
 * Tenant-prefixed Supabase Storage paths (ADR 0004 / migration 07).
 *
 * Client uploads read NEXT_PUBLIC_MA5_TENANT_ID; server paths may use
 * requireMa5TenantId() via storageTenantId().
 */

import { requireMa5TenantId } from "@/lib/tenant/deployment";

export function storageTenantId(): string {
  const serverId = process.env.MA5_TENANT_ID?.trim();
  if (serverId) return requireMa5TenantId();

  const publicId = process.env.NEXT_PUBLIC_MA5_TENANT_ID?.trim();
  if (publicId) return publicId;

  throw new Error(
    "MA5_TENANT_ID (server) or NEXT_PUBLIC_MA5_TENANT_ID (browser) is required for storage paths",
  );
}

export function memberJourneyPhotoPath(userId: string, fileId: string): string {
  return `${storageTenantId()}/members/${userId}/${fileId}.jpg`;
}

export function brandAvatarPath(userId: string, fileId: string): string {
  return `${storageTenantId()}/brand/avatar/${userId}/${fileId}.jpg`;
}

export function brandLogoPath(fileId: string): string {
  return `${storageTenantId()}/brand/logos/${fileId}.jpg`;
}

export function brandMarketingGalleryPath(
  section: string,
  fileId: string,
): string {
  return `${storageTenantId()}/brand/marketing/${section}/${fileId}.jpg`;
}

export function exerciseVideoPath(
  exerciseId: string,
  fileName: string,
): string {
  const ext =
    fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
    "mp4";
  return `${storageTenantId()}/exercises/${exerciseId}/${crypto.randomUUID()}.${ext}`;
}

export function exerciseVideoPrefix(exerciseId: string): string {
  return `${storageTenantId()}/exercises/${exerciseId}/`;
}

export function isTenantPrefixedStoragePath(path: string): boolean {
  const tenantId = storageTenantId();
  return path.startsWith(`${tenantId}/`);
}
