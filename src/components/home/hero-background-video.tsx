"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type HeroBackgroundVideoProps = {
  videoSrc: string;
  posterSrc: string;
  posterAlt: string;
};

export function HeroBackgroundVideo({
  videoSrc,
  posterSrc,
  posterAlt,
}: HeroBackgroundVideoProps) {
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setShowVideo(!prefersReducedMotion);
  }, []);

  if (!showVideo) {
    return (
      <Image
        src={posterSrc}
        alt={posterAlt}
        fill
        priority
        sizes="100vw"
        className="object-cover object-center brightness-110"
      />
    );
  }

  return (
    <video
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster={posterSrc}
      aria-hidden
      className="absolute inset-0 h-full w-full object-cover object-center brightness-110"
    >
      <source src={videoSrc} type="video/mp4" />
      <source src={videoSrc} type="video/quicktime" />
    </video>
  );
}
