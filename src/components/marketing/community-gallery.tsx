"use client";

import { useEffect, useState } from "react";

import type { MarketingGalleryItem } from "@/features/marketing-gallery/types";
import { cn } from "@/lib/utils";

type CommunityPhotoGridProps = {
  items: MarketingGalleryItem[];
  className?: string;
};

export function CommunityPhotoGrid({
  items,
  className,
}: CommunityPhotoGridProps) {
  const [active, setActive] = useState<MarketingGalleryItem | null>(null);

  useEffect(() => {
    if (!active) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [active]);

  if (items.length === 0) return null;

  return (
    <>
      <div
        className={cn(
          "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
          className,
        )}
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(item)}
            className="group border border-border bg-surface text-left transition hover:border-muted"
            aria-label={`View larger: ${item.altText || "Community photo"}`}
          >
            <div className="bg-background/50 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt={item.altText || "MA5 Performance community"}
                className="mx-auto h-44 w-full object-contain transition duration-300 group-hover:opacity-90 sm:h-48"
              />
            </div>
          </button>
        ))}
      </div>

      {active ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 sm:p-8"
          onClick={() => setActive(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Expanded community photo"
        >
          <button
            type="button"
            onClick={() => setActive(null)}
            className="absolute top-4 right-4 inline-flex min-h-10 items-center border border-border bg-surface px-3 text-xs font-semibold tracking-wide text-foreground uppercase"
          >
            Close
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={active.imageUrl}
            alt={active.altText || "MA5 Performance community"}
            className="max-h-[85vh] max-w-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
