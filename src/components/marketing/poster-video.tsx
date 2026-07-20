"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

type PosterVideoProps = {
  videoSrc: string;
  posterSrc: string;
  title: string;
  className?: string;
};

function PlayIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="ml-1 h-7 w-7 fill-current"
    >
      <path d="M8 5.14v13.72L19 12 8 5.14z" />
    </svg>
  );
}

export function PosterVideo({
  videoSrc,
  posterSrc,
  title,
  className,
}: PosterVideoProps) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    setPlaying(true);
    requestAnimationFrame(() => {
      void videoRef.current?.play();
    });
  };

  if (!playing) {
    return (
      <button
        type="button"
        onClick={handlePlay}
        className={cn(
          "group relative aspect-video w-full overflow-hidden text-left",
          className,
        )}
        aria-label={`Play video: ${title}`}
      >
        <Image
          src={posterSrc}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover transition duration-300 group-hover:scale-[1.02]"
        />
        <div className="absolute inset-0 bg-black/40 transition duration-300 group-hover:bg-black/50" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-lg transition duration-300 group-hover:scale-105">
            <PlayIcon />
          </span>
          <span className="text-sm font-semibold tracking-[0.18em] text-white uppercase">
            Watch video
          </span>
        </div>
      </button>
    );
  }

  return (
    <div className={cn("relative aspect-video w-full overflow-hidden bg-black", className)}>
      <video
        ref={videoRef}
        src={videoSrc}
        controls
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
        title={title}
      >
        <track kind="captions" />
      </video>
    </div>
  );
}
