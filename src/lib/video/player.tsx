"use client";

import { parseExternalVideoUrl } from "@/lib/video/parse";

type VideoPlayerProps = {
  videoSource: "upload" | "youtube" | "vimeo" | "none";
  videoUrl?: string | null;
  playbackUrl?: string | null;
  title?: string;
  className?: string;
};

export function VideoPlayer({
  videoSource,
  videoUrl,
  playbackUrl,
  title = "Exercise video",
  className,
}: VideoPlayerProps) {
  if (videoSource === "youtube" || videoSource === "vimeo") {
    const parsed = videoUrl ? parseExternalVideoUrl(videoUrl) : null;
    if (!parsed) {
      return (
        <div
          className={
            className ??
            "flex aspect-video items-center justify-center border border-border bg-background text-sm text-muted"
          }
        >
          Invalid video URL
        </div>
      );
    }
    return (
      <div className={className ?? "aspect-video overflow-hidden border border-border bg-background"}>
        <iframe
          title={title}
          src={parsed.embedUrl}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (videoSource === "upload" && playbackUrl) {
    return (
      <div className={className ?? "aspect-video overflow-hidden border border-border bg-background"}>
        <video
          className="h-full w-full"
          controls
          playsInline
          preload="metadata"
          src={playbackUrl}
        >
          <track kind="captions" />
        </video>
      </div>
    );
  }

  return (
    <div
      className={
        className ??
        "flex aspect-video items-center justify-center border border-border bg-background text-sm text-muted"
      }
    >
      No video
    </div>
  );
}
