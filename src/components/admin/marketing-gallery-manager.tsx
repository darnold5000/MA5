"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  MarketingGalleryItem,
  MarketingGallerySection,
} from "@/features/marketing-gallery/types";
import { uploadMarketingGalleryImageFromBrowser } from "@/lib/assets/browser-upload";

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

type MarketingGalleryManagerProps = {
  section: MarketingGallerySection;
  title: string;
  description: string;
  initialItems: MarketingGalleryItem[];
  showClientName?: boolean;
  showFeatured?: boolean;
};

export function MarketingGalleryManager({
  section,
  title,
  description,
  initialItems,
  showClientName = false,
  showFeatured = false,
}: MarketingGalleryManagerProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState(initialItems);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [featured, setFeatured] = useState(false);

  async function onUpload(file: File | undefined) {
    if (!file) return;
    setPending(true);
    setError(null);
    setMessage(null);

    const uploaded = await uploadMarketingGalleryImageFromBrowser({ section, file });
    if ("error" in uploaded && !uploaded.demoDataUrl) {
      setPending(false);
      setError(uploaded.error);
      return;
    }

    const storagePath =
      "path" in uploaded
        ? uploaded.path
        : `demo:${uploaded.demoDataUrl ?? ""}`;

    const res = await fetch("/api/admin/marketing/gallery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section,
        storagePath,
        clientName: showClientName ? clientName || null : null,
        altText: showClientName
          ? `${clientName || "Client"} at MA5 Performance`
          : "MA5 Performance community",
        featured: showFeatured ? featured : false,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      item?: MarketingGalleryItem;
      warning?: string;
    };
    setPending(false);

    if (!res.ok || !data.item) {
      setError(data.error ?? "Could not save photo");
      return;
    }

    setItems((current) => [data.item!, ...current]);
    setClientName("");
    setFeatured(false);
    setMessage(data.warning ?? "Photo uploaded");
    router.refresh();
  }

  async function removeItem(id: string) {
    if (!window.confirm("Delete this photo?")) return;
    setPending(true);
    setError(null);
    setMessage(null);

    const res = await fetch(`/api/admin/marketing/gallery?id=${id}`, {
      method: "DELETE",
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; warning?: string };
    setPending(false);

    if (!res.ok) {
      setError(data.error ?? "Could not delete photo");
      return;
    }

    setItems((current) => current.filter((item) => item.id !== id));
    setMessage(data.warning ?? "Photo deleted");
    router.refresh();
  }

  return (
    <section className="space-y-4 border border-border bg-surface p-5 sm:p-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          {title}
        </p>
        <p className="mt-2 text-sm text-muted">{description}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {showClientName ? (
          <label className="min-w-[12rem] flex-1 space-y-1 text-sm">
            <span className="text-xs font-semibold tracking-wide uppercase">
              Client name (optional)
            </span>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="min-h-11 w-full border border-border bg-background px-3"
            />
          </label>
        ) : null}
        {showFeatured ? (
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
            />
            <span className="text-xs font-semibold tracking-wide uppercase">
              Feature on home page
            </span>
          </label>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={(e) => {
            void onUpload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-11 items-center bg-brand px-4 text-xs font-semibold tracking-wide text-brand-foreground uppercase disabled:opacity-50"
        >
          {pending ? "Uploading…" : "Upload photo"}
        </button>
      </div>

      {error ? (
        <p className="text-sm text-brand" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-foreground" role="status">
          {message}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
          No uploaded photos yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <figure key={item.id} className="border border-border bg-background">
              <div className="relative bg-background/50 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt={item.altText}
                  className="h-auto w-full"
                />
              </div>
              <figcaption className="flex items-center justify-between gap-3 border-t border-border px-3 py-2">
                <div className="min-w-0 text-xs text-muted">
                  {item.clientName ? (
                    <p className="truncate font-semibold tracking-wide text-foreground uppercase">
                      {item.clientName}
                    </p>
                  ) : null}
                  {item.featured ? (
                    <p className="text-brand">Featured on home</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void removeItem(item.id)}
                  aria-label="Delete photo"
                  className="inline-flex min-h-9 min-w-9 items-center justify-center border border-border text-muted transition hover:border-brand hover:text-brand disabled:opacity-50"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
