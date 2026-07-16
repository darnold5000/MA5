"use client";

import { useEffect, useId, useState } from "react";

import { cn } from "@/lib/utils";

type ClientHubPreviewProps = {
  /** Path inside Fitness Hub to preview */
  href?: string;
  label?: string;
  className?: string;
};

export function ClientHubPreview({
  href = "/app",
  label = "Preview client view",
  className,
}: ClientHubPreviewProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "text-left text-sm tracking-wide text-muted transition hover:text-foreground",
          className,
        )}
      >
        {label}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Close client preview"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative flex h-[min(90vh,820px)] w-full max-w-5xl flex-col border border-border bg-background shadow-2xl"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <p
                  id={titleId}
                  className="text-xs font-semibold tracking-[0.2em] text-brand uppercase"
                >
                  Client preview
                </p>
                <p className="mt-1 text-sm text-muted">
                  Fitness Hub as members see it — you stay in Operations.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-10 items-center border border-border px-4 text-xs font-semibold tracking-wide uppercase"
              >
                Close preview
              </button>
            </div>
            <iframe
              title="Fitness Hub client preview"
              src={href}
              className="min-h-0 w-full flex-1 bg-background"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
