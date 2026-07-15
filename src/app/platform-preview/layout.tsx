import Link from "next/link";

export default function PlatformPreviewLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
              Internal
            </p>
            <p className="font-display text-xl tracking-wide uppercase">
              Platform preview
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-muted transition hover:text-foreground"
          >
            Public site
          </Link>
        </div>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        {children}
      </main>
    </div>
  );
}
