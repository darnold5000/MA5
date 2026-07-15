import Link from "next/link";

import { cn } from "@/lib/utils";

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  nav: Array<{ href: string; label: string; active?: boolean }>;
  footerNote?: string;
};

export function AppShell({
  title,
  subtitle,
  children,
  nav,
  footerNote,
}: AppShellProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
              MA5 Client
            </p>
            <h1 className="font-display text-2xl tracking-wide uppercase">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-muted">{subtitle}</p>
            ) : null}
          </div>
          <Link
            href="/"
            className="text-sm text-muted transition hover:text-foreground"
          >
            Public site
          </Link>
        </div>
        <nav
          aria-label="Client app"
          className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-3 sm:px-6 lg:px-8"
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center border px-3 text-xs font-semibold tracking-wide uppercase transition",
                item.active
                  ? "border-brand bg-brand text-brand-foreground"
                  : "border-border text-muted hover:border-brand hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
      {footerNote ? (
        <footer className="border-t border-border px-4 py-4 text-center text-xs text-muted sm:px-6">
          {footerNote}
        </footer>
      ) : null}
    </div>
  );
}
