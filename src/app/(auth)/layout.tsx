import Link from "next/link";
import Image from "next/image";

import { siteConfig } from "@/content/site-config";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border bg-background/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 text-foreground">
            <Image
              src="/images/brand/ma5-logo.jpeg"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 rounded-full object-cover"
            />
            <span className="font-display text-lg tracking-[0.08em] uppercase">
              {siteConfig.shortName}
              <span className="text-brand"> Performance</span>
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm text-muted transition hover:text-foreground"
          >
            Back to site
          </Link>
        </div>
      </header>
      <main
        id="main-content"
        className="flex flex-1 items-start justify-center px-4 py-4 sm:items-center sm:px-6 sm:py-12"
      >
        {children}
      </main>
    </div>
  );
}
