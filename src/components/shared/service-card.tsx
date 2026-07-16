import Image from "next/image";
import Link from "next/link";

import { ButtonLink } from "@/components/shared/button-link";
import { getBookingHref } from "@/content/booking";
import type { Service } from "@/content/services";

type ServiceCardProps = {
  service: Service;
};

export function ServiceCard({ service }: ServiceCardProps) {
  const bookHref = getBookingHref(service.bookingType);

  return (
    <article className="group flex h-full flex-col border border-border bg-surface">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-strong">
        <Image
          src={service.imageSrc}
          alt={service.imageAlt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute inset-0 flex items-end p-5">
          <p className="font-display text-2xl tracking-wide text-foreground uppercase">
            {service.title}
          </p>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-5 p-5">
        <p className="text-sm leading-relaxed text-muted">{service.summary}</p>
        <div className="mt-auto flex flex-wrap gap-3">
          <ButtonLink href={bookHref} className="min-h-11 px-4 text-xs">
            Book Now
          </ButtonLink>
          <Link
            href={service.href}
            className="inline-flex min-h-11 items-center text-sm text-foreground underline-offset-4 hover:text-brand hover:underline"
          >
            Learn more
          </Link>
        </div>
      </div>
    </article>
  );
}
