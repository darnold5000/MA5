"use client";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  BRAND_ASSETS_BUCKET,
  isAllowedImageType,
  MAX_IMAGE_BYTES,
  publicAssetUrl,
} from "@/lib/assets/constants";
import {
  JOURNEY_PHOTOS_BUCKET,
  journeyPhotoPath,
} from "@/lib/journey/constants";

/** Resize/compress in the browser before upload (keeps avatars small). */
export async function fileToJpegBlob(
  file: File,
  maxEdge = 800,
  quality = 0.85,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not encode image"))),
      "image/jpeg",
      quality,
    );
  });
  return blob;
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(blob);
  });
}

export async function uploadJourneyPhotoFromBrowser(input: {
  userId: string;
  file: File;
}): Promise<
  | { path: string; demoDataUrl?: string }
  | { error: string; demoDataUrl?: string }
> {
  if (!isAllowedImageType(input.file.type) && !input.file.type.startsWith("image/")) {
    return { error: "Use JPG, PNG, or WebP." };
  }
  if (input.file.size > MAX_IMAGE_BYTES) {
    return { error: "Image must be 5MB or smaller." };
  }

  try {
    const blob = await fileToJpegBlob(input.file, 1600, 0.88);
    const fileId = crypto.randomUUID();
    const path = journeyPhotoPath(input.userId, fileId);

    if (!isSupabaseConfigured()) {
      const dataUrl = await blobToDataUrl(blob);
      return { path, demoDataUrl: dataUrl };
    }

    const supabase = createClient();
    const { error } = await supabase.storage
      .from(JOURNEY_PHOTOS_BUCKET)
      .upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if (error) return { error: error.message };
    return { path };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Upload failed",
    };
  }
}

export async function uploadAvatarFromBrowser(input: {
  userId: string;
  file: File;
}): Promise<{ path: string; url: string } | { error: string; demoDataUrl?: string }> {
  if (!isAllowedImageType(input.file.type) && !input.file.type.startsWith("image/")) {
    return { error: "Use JPG, PNG, WebP, or GIF." };
  }
  if (input.file.size > MAX_IMAGE_BYTES) {
    return { error: "Image must be 5MB or smaller." };
  }

  try {
    const blob = await fileToJpegBlob(input.file, 800);
    const path = `avatars/${input.userId}/${crypto.randomUUID()}.jpg`;

    if (!isSupabaseConfigured()) {
      const dataUrl = await blobToDataUrl(blob);
      return { error: "demo", demoDataUrl: dataUrl };
    }

    const supabase = createClient();
    const { error } = await supabase.storage
      .from(BRAND_ASSETS_BUCKET)
      .upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if (error) {
      const dataUrl = await blobToDataUrl(blob);
      return { error: error.message, demoDataUrl: dataUrl };
    }
    const url = publicAssetUrl(path);
    if (!url) return { error: "Could not build image URL" };
    return { path, url };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Upload failed",
    };
  }
}

export async function uploadLogoFromBrowser(input: {
  file: File;
}): Promise<{ path: string; url: string } | { error: string; demoDataUrl?: string }> {
  if (!isAllowedImageType(input.file.type) && !input.file.type.startsWith("image/")) {
    return { error: "Use JPG, PNG, WebP, or GIF." };
  }
  if (input.file.size > MAX_IMAGE_BYTES) {
    return { error: "Image must be 5MB or smaller." };
  }

  try {
    const blob = await fileToJpegBlob(input.file, 1200, 0.9);
    const path = `logos/${crypto.randomUUID()}.jpg`;

    if (!isSupabaseConfigured()) {
      const dataUrl = await blobToDataUrl(blob);
      return { error: "demo", demoDataUrl: dataUrl };
    }

    const supabase = createClient();
    const { error } = await supabase.storage
      .from(BRAND_ASSETS_BUCKET)
      .upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if (error) {
      const dataUrl = await blobToDataUrl(blob);
      return { error: error.message, demoDataUrl: dataUrl };
    }
    const url = publicAssetUrl(path);
    if (!url) return { error: "Could not build image URL" };
    return { path, url };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Upload failed",
    };
  }
}
