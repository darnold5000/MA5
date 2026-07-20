"use client";

import Image from "next/image";
import { useState } from "react";

type SaunaVideoProps = {
  embedUrl: string;
  title: string;
  posterSrc: string;
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

function SaunaVideoFrame({ embedUrl, title }: Pick<SaunaVideoProps, "embedUrl" | "title">) {
  return (
    <div className="relative aspect-video w-full overflow-hidden">
      <iframe
        src={embedUrl}
        title={title}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        className="absolute top-1/2 left-1/2 border-0"
        style={{
          width: "178%",
          height: "178%",
          transform: "translate(-50%, -50%) rotate(-90deg) scale(1.45)",
        }}
      />
    </div>
  );
}

export function SaunaVideo({ embedUrl, title, posterSrc }: SaunaVideoProps) {
  const [playing, setPlaying] = useState(false);

  const autoplayUrl = embedUrl.replace("autoplay=0", "autoplay=1");

  if (!playing) {
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className="group relative aspect-video w-full overflow-hidden border border-border text-left"
        aria-label={`Play video: ${title}`}
      >
        <Image
          src={posterSrc}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 45vw"
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

  return <SaunaVideoFrame embedUrl={autoplayUrl} title={title} />;
}
