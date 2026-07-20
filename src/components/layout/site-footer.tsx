import Image from "next/image";
import Link from "next/link";

import { FooterCredit } from "@/components/shared/footer-credit";
import { siteConfig } from "@/content/site-config";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            <Image
              src="/images/brand/ma5-logo.jpeg"
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 rounded-full object-cover"
            />
            <p className="font-display text-3xl tracking-wide uppercase">
              {siteConfig.name}
            </p>
          </div>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
            {siteConfig.description}
          </p>
          <p className="mt-4 text-sm text-muted">
            {siteConfig.location.fullAddress}
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <a
              href={siteConfig.social.instagram}
              target="_blank"
              rel="noreferrer"
              className="text-muted transition hover:text-foreground"
            >
              Instagram
            </a>
            <a
              href={siteConfig.social.facebook}
              target="_blank"
              rel="noreferrer"
              className="text-muted transition hover:text-foreground"
            >
              Facebook
            </a>
            <a
              href={siteConfig.social.linkedin}
              target="_blank"
              rel="noreferrer"
              className="text-muted transition hover:text-foreground"
            >
              LinkedIn
            </a>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
            Explore
          </p>
          <ul className="mt-4 space-y-2">
            {siteConfig.navigation.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-muted transition hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={siteConfig.booking.path}
                className="text-sm text-muted transition hover:text-foreground"
              >
                Book Now
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
            Contact
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            <li>
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className="transition hover:text-foreground"
              >
                {siteConfig.contact.email}
              </a>
            </li>
            <li>
              <a
                href={siteConfig.location.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-foreground"
              >
                Get directions
              </a>
            </li>
            {siteConfig.footerLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="transition hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/login?next=/admin"
                className="transition hover:text-foreground"
              >
                Staff login
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            © {year} {siteConfig.name}. All rights reserved.
          </p>
          <FooterCredit
            clientName={siteConfig.name}
            signalWorksUrl={siteConfig.signalWorks.url}
            signalWorksIconSrc={siteConfig.signalWorks.iconSrc}
            variant={siteConfig.signalWorks.creditVariant}
          />
        </div>
      </div>
    </footer>
  );
}
