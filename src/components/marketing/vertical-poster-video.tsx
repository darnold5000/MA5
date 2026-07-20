"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

type VerticalPosterVideoProps = {
  videoSrc: string;
  posterSrc: string;
  title: string;
  className?: string;
  /** Fill a parent container (e.g. 16:9 card media area) instead of standalone 9:16 */
  fill?: boolean;
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

export function VerticalPosterVideo({
  videoSrc,
  posterSrc,
  title,
  className,
  fill = false,
}: VerticalPosterVideoProps) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    setPlaying(true);
    requestAnimationFrame(() => {
      void videoRef.current?.play();
    });
  };

  const frameClass = cn(
    "relative overflow-hidden text-left",
    fill
      ? "h-full w-full max-w-none"
      : "mx-auto aspect-[9/16] w-full max-w-sm",
    className,
  );

  if (!playing) {
    return (
      <button
        type="button"
        onClick={handlePlay}
        className={cn("group", frameClass)}
        aria-label={`Play video: ${title}`}
      >
        <Image
          src={posterSrc}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 320px"
          className={cn(
            "transition duration-300 group-hover:scale-[1.02]",
            fill ? "object-contain" : "object-cover",
          )}
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
    <div className={cn(frameClass, "bg-black")}>
      <video
        ref={videoRef}
        src={videoSrc}
        controls
        playsInline
        preload="metadata"
        className="h-full w-full object-contain"
        title={title}
      >
        <track kind="captions" />
      </video>
    </div>
  );
}
