import type { Transformation } from "@/content/transformations";
import { cn } from "@/lib/utils";

type TransformationGalleryProps = {
  items: Transformation[];
  className?: string;
};

function TransformationImage({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  return (
    // Supabase and other remote gallery URLs are not optimized through next/image.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className="h-auto w-full" loading="lazy" />
  );
}

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
        <figure key={item.id} className="border border-border bg-surface">
          <div className="bg-background/50 p-2">
            <TransformationImage src={item.src} alt={item.alt} />
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
