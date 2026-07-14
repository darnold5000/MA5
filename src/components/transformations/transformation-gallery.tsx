import Image from "next/image";

import type { Transformation } from "@/content/transformations";
import { cn } from "@/lib/utils";

type TransformationGalleryProps = {
  items: Transformation[];
  className?: string;
};

export function TransformationGallery({
  items,
  className,
}: TransformationGalleryProps) {
  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {items.map((item) => (
        <figure
          key={item.id}
          className="group overflow-hidden border border-border bg-surface"
        >
          <div className="relative aspect-square overflow-hidden">
            <Image
              src={item.src}
              alt={item.alt}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          </div>
          {item.clientName ? (
            <figcaption className="border-t border-border px-4 py-3 text-sm tracking-wide text-muted uppercase">
              {item.clientName}
            </figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}
