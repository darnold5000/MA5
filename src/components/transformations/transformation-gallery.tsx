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
      width={0}
      height={0}
      sizes={sizes}
      className="h-auto w-full"
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
            className="border border-border bg-surface"
          >
            <div className="bg-background/50 p-2">
              {images.length > 1 ? (
                <div className="flex flex-col gap-2">
                  {images.map((src, index) => (
                    <TransformationImage
                      key={src}
                      src={src}
                      alt={`${item.alt} (${index + 1} of ${images.length})`}
                      sizes={imageSizes}
                    />
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
