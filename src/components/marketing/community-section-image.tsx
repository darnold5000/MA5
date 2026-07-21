import { cn } from "@/lib/utils";

type CommunitySectionImageProps = {
  src?: string | null;
  alt: string;
  placeholderLabel: string;
  className?: string;
  /** Default event-block aspect; set false for full-bleed hero. */
  framed?: boolean;
  priority?: boolean;
};

/**
 * Reusable community photo slot. Shows the uploaded image when present;
 * otherwise a dashed placeholder matching the text section layout.
 */
export function CommunitySectionImage({
  src,
  alt,
  placeholderLabel,
  className,
  framed = true,
  priority = false,
}: CommunitySectionImageProps) {
  const frameClass = framed ? "aspect-[4/3]" : "h-full w-full";

  if (src) {
    return (
      <div className={cn("relative overflow-hidden bg-surface", frameClass, className)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- remote Supabase URLs */}
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          loading={priority ? "eager" : "lazy"}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center border border-dashed border-border bg-surface px-6 text-center",
        frameClass,
        className,
      )}
      role="img"
      aria-label={`Photo placeholder: ${placeholderLabel}`}
    >
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
          Photo coming soon
        </p>
        <p className="mt-2 text-sm text-muted">{placeholderLabel}</p>
      </div>
    </div>
  );
}
