import Link from "next/link";

import { AdminAppNav } from "@/components/platform/platform-nav";
import { DemoPreviewChrome } from "@/components/platform/demo-preview";
import { SignOutButton } from "@/components/platform/sign-out-button";

type AdminShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function AdminShell({ title, subtitle, children }: AdminShellProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
              MA5 Staff
            </p>
            <h1 className="font-display text-2xl tracking-wide uppercase">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-muted">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/app"
              className="text-muted transition hover:text-foreground"
            >
              Client portal
            </Link>
            <Link
              href="/"
              className="text-muted transition hover:text-foreground"
            >
              Website
            </Link>
            <SignOutButton className="text-sm text-muted transition hover:text-foreground" />
          </div>
        </div>
        <AdminAppNav />
      </header>
      <main
        id="main-content"
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8"
      >
        {children}
      </main>
      <DemoPreviewChrome />
    </div>
  );
}
