import type { Metadata } from "next";
import { Manrope, Oswald } from "next/font/google";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { StickyBookButton } from "@/components/shared/sticky-book-button";
import { siteConfig } from "@/content/site-config";
import { env } from "@/lib/env";

import "./globals.css";

const display = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const body = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: `${siteConfig.name} | Personal Training in Avon, Indiana`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: env.siteUrl,
    siteName: siteConfig.name,
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:bg-brand focus:px-4 focus:py-2 focus:text-brand-foreground"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main-content" className="flex-1 pb-20 md:pb-0">
          {children}
        </main>
        <SiteFooter />
        <StickyBookButton />
      </body>
    </html>
  );
}
