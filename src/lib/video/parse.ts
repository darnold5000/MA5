/**
 * Parse YouTube / Vimeo URLs into embeddable playback info.
 */

export type ExternalVideoProvider = "youtube" | "vimeo";

export type ParsedExternalVideo = {
  provider: ExternalVideoProvider;
  id: string;
  embedUrl: string;
  watchUrl: string;
};

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);

export function parseExternalVideoUrl(
  raw: string,
): ParsedExternalVideo | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();

  if (YOUTUBE_HOSTS.has(host)) {
    let id: string | null = null;
    if (host.includes("youtu.be")) {
      id = url.pathname.replace(/^\//, "").split("/")[0] || null;
    } else if (url.pathname.startsWith("/embed/")) {
      id = url.pathname.split("/")[2] || null;
    } else if (url.pathname.startsWith("/shorts/")) {
      id = url.pathname.split("/")[2] || null;
    } else {
      id = url.searchParams.get("v");
    }
    if (!id) return null;
    return {
      provider: "youtube",
      id,
      embedUrl: `https://www.youtube.com/embed/${id}`,
      watchUrl: `https://www.youtube.com/watch?v=${id}`,
    };
  }

  if (VIMEO_HOSTS.has(host)) {
    const parts = url.pathname.split("/").filter(Boolean);
    const id = parts.find((p) => /^\d+$/.test(p));
    if (!id) return null;
    return {
      provider: "vimeo",
      id,
      embedUrl: `https://player.vimeo.com/video/${id}`,
      watchUrl: `https://vimeo.com/${id}`,
    };
  }

  return null;
}

export function detectVideoSourceFromUrl(
  raw: string,
): "youtube" | "vimeo" | null {
  return parseExternalVideoUrl(raw)?.provider ?? null;
}
