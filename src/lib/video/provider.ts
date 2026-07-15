/**
 * Abstract video provider interface.
 * Implementations (Supabase Storage, Mux, Cloudflare Stream) land later.
 * Do not store large training videos in the Next.js public directory.
 */
export type VideoAsset = {
  id: string;
  title: string;
  provider: "supabase" | "mux" | "cloudflare" | "external";
  playbackUrl?: string;
  thumbnailUrl?: string;
};

export interface VideoProvider {
  getPlaybackInfo(assetId: string): Promise<VideoAsset>;
}
