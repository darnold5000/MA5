import Image from "next/image";

import type { MarketingGalleryItem } from "@/features/marketing-gallery/types";
import { cn } from "@/lib/utils";

type CommunityGalleryProps = {
  items: MarketingGalleryItem[];
  fallbackImage: { src: string; alt: string };
  className?: string;
};

export function CommunityGallery({
  items,
  fallbackImage,
  className,
}: CommunityGalleryProps) {
  if (items.length === 0) {
    return (
      <div
        className={cn(
          "relative aspect-[4/3] overflow-hidden border border-border",
          className,
        )}
      >
        <Image
          src={fallbackImage.src}
          alt={fallbackImage.alt}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 40vw"
        />
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", className)}>
      {items.map((item) => (
        <figure
          key={item.id}
          className="border border-border bg-surface"
        >
          <div className="bg-background/50 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imageUrl}
              alt={item.altText || fallbackImage.alt}
              className="h-auto w-full"
            />
          </div>
        </figure>
      ))}
    </div>
  );
}
