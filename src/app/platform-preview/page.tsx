import type { Metadata } from "next";
import Link from "next/link";

import { platformPreviews } from "@/content/platform-previews";

export const metadata: Metadata = {
  title: "Platform preview",
  description:
    "Internal MA5 platform demo index. Not linked from public navigation.",
  robots: { index: false, follow: false },
};

export default function PlatformPreviewPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl tracking-wide uppercase">
          Compare platform directions
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          Use this internal page to review separately deployable demos. The
          live marketing site stays the foundation — these branches extend it
          without redesigning public pages. This route is intentionally omitted
          from the public navigation.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/app"
            className="inline-flex min-h-11 items-center bg-brand px-5 text-xs font-semibold tracking-wide text-brand-foreground uppercase"
          >
            Open Fitness Hub
          </Link>
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center border border-border px-5 text-xs font-semibold tracking-wide uppercase"
          >
            Open Operations
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center border border-border px-5 text-xs font-semibold tracking-wide uppercase"
          >
            Auth
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        {platformPreviews.map((item) => (
          <article
            key={item.id}
            className="border border-border bg-surface p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
                  {item.status.replace("-", " ")}
                </p>
                <h2 className="mt-1 font-display text-2xl tracking-wide uppercase">
                  {item.title}
                </h2>
                <p className="mt-1 font-mono text-xs text-muted">{item.branch}</p>
              </div>
              {item.href ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase"
                >
                  Open preview
                </a>
              ) : (
                <span className="inline-flex min-h-11 items-center border border-border px-4 text-xs font-semibold tracking-wide text-muted uppercase">
                  Preview URL pending
                </span>
              )}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              {item.summary}
            </p>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted">
              {item.evaluates.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
