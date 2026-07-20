"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { ButtonLink } from "@/components/shared/button-link";
import { siteConfig } from "@/content/site-config";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type SiteHeaderProps = {
  /** Session or demo cookie already grants Fitness Hub access */
  hubAccess?: boolean;
};

function isNavActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const navLinkClass = (active: boolean) =>
  cn(
    "text-sm tracking-wide transition",
    active
      ? "font-semibold text-brand"
      : "text-muted hover:text-foreground",
  );

export function SiteHeader({ hubAccess = false }: SiteHeaderProps) {
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
      <div className="mx-auto grid w-full max-w-screen-2xl grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          onClick={closeMenu}
          className="flex shrink-0 items-center gap-2.5 text-foreground sm:gap-3"
        >
          <Image
            src="/images/brand/ma5-logo.jpeg"
            alt=""
            width={40}
            height={40}
            className="h-9 w-9 rounded-full object-cover sm:h-10 sm:w-10"
          />
          <span className="font-display text-lg tracking-[0.08em] uppercase sm:text-xl">
            {siteConfig.shortName}
            <span className="text-brand"> Performance</span>
          </span>
        </Link>

        <nav
          aria-label="Primary"
          className="hidden min-w-0 items-center justify-center gap-3 lg:flex xl:gap-4"
        >
          {siteConfig.navigation.map((item) => {
            const active = isNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  navLinkClass(active),
                  "whitespace-nowrap",
                  active && "border-b-2 border-brand pb-0.5",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          {hubAccess ? (
            <ButtonLink
              href="/app"
              variant="secondary"
              className="min-h-10 px-4 text-xs"
            >
              Fitness Hub
            </ButtonLink>
          ) : (
            <ButtonLink
              href="/login"
              variant="secondary"
              className="min-h-10 px-4 text-xs"
            >
              Sign in
            </ButtonLink>
          )}
          <ButtonLink
            href={siteConfig.booking.path}
            onClick={() => trackEvent("nav_book_click", { location: "desktop" })}
            className="min-h-10 px-4 text-xs"
          >
            Book Now
          </ButtonLink>
        </div>

        <button
          type="button"
          className="col-start-3 inline-flex min-h-11 min-w-11 items-center justify-center border border-border text-foreground lg:hidden"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          {open ? (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </div>

      <div
        id={menuId}
        hidden={!open}
        className="border-t border-border bg-background lg:hidden"
      >
        <nav
          aria-label="Mobile"
          className="mx-auto flex max-w-screen-2xl flex-col gap-1 px-4 py-4 sm:px-6"
        >
          {siteConfig.navigation.map((item) => {
            const active = isNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "min-h-11 border-l-2 px-3 py-3 text-base",
                  active
                    ? "border-brand bg-surface font-semibold text-brand"
                    : "border-transparent text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          {hubAccess ? (
            <ButtonLink
              href="/app"
              variant="secondary"
              onClick={closeMenu}
              className="mt-2 w-full"
            >
              Fitness Hub
            </ButtonLink>
          ) : (
            <ButtonLink
              href="/login"
              variant="secondary"
              onClick={closeMenu}
              className="mt-2 w-full"
            >
              Sign in
            </ButtonLink>
          )}
        </nav>
      </div>
    </header>
  );
}
