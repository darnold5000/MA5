/**
 * Abstract video provider interface.
 * Active implementations: Supabase Storage uploads + YouTube/Vimeo embeds
 * via `src/lib/video/{storage,parse,player}.tsx`.
 * Do not store large training videos in the Next.js public directory.
 */
export type VideoAsset = {
  id: string;
  title: string;
  provider: "supabase" | "youtube" | "vimeo" | "mux" | "cloudflare" | "external";
  playbackUrl?: string;
  thumbnailUrl?: string;
};

export interface VideoProvider {
  getPlaybackInfo(assetId: string): Promise<VideoAsset>;
}
