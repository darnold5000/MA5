"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { ButtonLink } from "@/components/shared/button-link";
import { siteConfig } from "@/content/site-config";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const closeMenu = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          onClick={closeMenu}
          className="flex items-center gap-3 text-foreground"
        >
          <Image
            src="/images/brand/ma5-logo.jpeg"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 rounded-full object-cover"
          />
          <span className="font-display text-xl tracking-[0.08em] uppercase sm:text-2xl">
            {siteConfig.shortName}
            <span className="text-brand"> Performance</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
          {siteConfig.navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm tracking-wide text-muted transition hover:text-foreground",
                pathname === item.href && "text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
          <ButtonLink
            href={siteConfig.booking.path}
            onClick={() => trackEvent("nav_book_click", { location: "desktop" })}
            className="min-h-11 px-5 text-xs"
          >
            Book Now
          </ButtonLink>
        </nav>

        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center border border-border text-foreground lg:hidden"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <span aria-hidden="true" className="font-display text-lg tracking-wide">
            {open ? "Close" : "Menu"}
          </span>
        </button>
      </div>

      <div
        id={menuId}
        hidden={!open}
        className="border-t border-border bg-background lg:hidden"
      >
        <nav
          aria-label="Mobile"
          className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6"
        >
          {siteConfig.navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMenu}
              className="min-h-11 px-2 py-3 text-base text-foreground"
            >
              {item.label}
            </Link>
          ))}
          <ButtonLink
            href={siteConfig.booking.path}
            onClick={() => {
              closeMenu();
              trackEvent("nav_book_click", { location: "mobile" });
            }}
            className="mt-2 w-full"
          >
            Book Now
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
