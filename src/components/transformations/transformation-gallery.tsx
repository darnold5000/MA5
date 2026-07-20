import Image from "next/image";

import type { Transformation } from "@/content/transformations";
import { cn } from "@/lib/utils";

type TransformationGalleryProps = {
  items: Transformation[];
  className?: string;
};

function TransformationImage({
  src,
  alt,
  sizes,
}: {
  src: string;
  alt: string;
  sizes: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className="object-cover transition duration-500 group-hover:scale-[1.03]"
    />
  );
}

export function TransformationGallery({
  items,
  className,
}: TransformationGalleryProps) {
  const imageSizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";

  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {items.map((item) => {
        const images = [item.src, ...(item.additionalImages ?? [])];

        return (
          <figure
            key={item.id}
            className="group overflow-hidden border border-border bg-surface"
          >
            <div className="relative aspect-square overflow-hidden">
              {images.length > 1 ? (
                <div className="flex h-full flex-col">
                  {images.map((src, index) => (
                    <div key={src} className="relative min-h-0 flex-1">
                      <TransformationImage
                        src={src}
                        alt={`${item.alt} (${index + 1} of ${images.length})`}
                        sizes={imageSizes}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <TransformationImage
                  src={item.src}
                  alt={item.alt}
                  sizes={imageSizes}
                />
              )}
            </div>
            {item.clientName ? (
              <figcaption className="border-t border-border px-4 py-3 text-sm tracking-wide text-muted uppercase">
                {item.clientName}
              </figcaption>
            ) : null}
          </figure>
        );
      })}
    </div>
  );
}
