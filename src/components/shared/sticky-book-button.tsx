"use client";

import { ButtonLink } from "@/components/shared/button-link";
import { trackEvent } from "@/lib/analytics";
import { siteConfig } from "@/content/site-config";
import { cn } from "@/lib/utils";

type StickyBookButtonProps = {
  className?: string;
};

export function StickyBookButton({ className }: StickyBookButtonProps) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur md:hidden",
        className,
      )}
    >
      <ButtonLink
        href={siteConfig.booking.path}
        onClick={() => trackEvent("sticky_book_click")}
        className="w-full"
      >
        Book Now
      </ButtonLink>
    </div>
  );
}
