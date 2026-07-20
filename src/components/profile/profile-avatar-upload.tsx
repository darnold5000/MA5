"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { uploadAvatarFromBrowser } from "@/lib/assets/browser-upload";

const DEMO_AVATAR_KEY = "ma5_demo_avatar";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "MA";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function ProfileAvatarUpload({
  userId,
  fullName,
  avatarUrl,
}: {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(() => {
    if (avatarUrl && avatarUrl !== "local:avatar") return avatarUrl;
    if (typeof window !== "undefined") {
      return localStorage.getItem(DEMO_AVATAR_KEY);
    }
    return null;
  });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const uploaded = await uploadAvatarFromBrowser({ userId, file });

      if ("path" in uploaded) {
        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            avatarStoragePath: uploaded.path,
            avatarUrl: uploaded.url,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not save photo");
        setPreview(uploaded.url);
        localStorage.removeItem(DEMO_AVATAR_KEY);
        setMessage("Photo saved");
        router.refresh();
        return;
      }

      if (uploaded.demoDataUrl) {
        localStorage.setItem(DEMO_AVATAR_KEY, uploaded.demoDataUrl);
        setPreview(uploaded.demoDataUrl);
        await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarUrl: "local:avatar" }),
        }).catch(() => null);
        setMessage(
          uploaded.error === "demo"
            ? "Photo saved on this device (demo)"
            : `Saved locally — ${uploaded.error}`,
        );
        router.refresh();
        return;
      }

      throw new Error(uploaded.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setPending(false);
    }
  }

  const src = preview;

  return (
    <div className="flex flex-wrap items-end gap-5">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-full border border-border bg-background">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center font-display text-2xl tracking-wide">
            {initials(fullName)}
          </div>
        )}
      </div>
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-10 items-center border border-border px-3 text-[11px] font-semibold tracking-wide uppercase disabled:opacity-50"
        >
          {pending ? "Uploading…" : "Change photo"}
        </button>
        {message ? (
          <p className="mt-2 text-xs hub-text-success">{message}</p>
        ) : null}
        {error ? (
          <p className="mt-2 text-xs text-brand" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
