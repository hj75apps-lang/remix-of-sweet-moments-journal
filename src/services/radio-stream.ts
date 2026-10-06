import { fetchRadioPlaylist } from "./radio-network";

export type StreamKind = "hls" | "playlist" | "direct";

export function streamKind(url: string): StreamKind {
  const path = (url.split("?")[0] ?? "").toLowerCase();
  if (path.endsWith(".m3u8")) return "hls";
  if (path.endsWith(".m3u") || path.endsWith(".pls") || path.endsWith(".asx")) return "playlist";
  return "direct";
}

/** Extracts stream URLs from M3U, PLS or ASX playlist text. */
export function parsePlaylist(text: string): string[] {
  const urls = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    const pls = /^File\d+=(.+)$/i.exec(t);
    const asx = /href="([^"]+)"/i.exec(t);
    const url = pls?.[1] ?? asx?.[1] ?? (t && !t.startsWith("#") && !t.startsWith("[") ? t : "");
    if (/^https?:\/\//i.test(url)) urls.add(url.trim());
  }
  return [...urls];
}

/** Resolves a playlist URL into playable https streams; direct URLs pass through. */
export async function resolveSource(url: string, fetcher: (url: string) => Promise<Response> = fetchRadioPlaylist): Promise<string[]> {
  if (streamKind(url) !== "playlist") return [url];
  try {
    const res = await fetcher(url);
    if (!res.ok) return [];
    return parsePlaylist(await res.text()).filter((u) => u.startsWith("https://"));
  } catch {
    return []; // playlist host blocks browser access
  }
}

/** Bounded reconnect: 1s, 2s, 4s, then give up. */
export const MAX_RECONNECTS = 3;
export function reconnectDelay(attempt: number): number | null {
  return attempt < MAX_RECONNECTS ? 1000 * 2 ** attempt : null;
}

export function canPlayNatively(kind: "aac" | "mp3" | "hls", el: HTMLMediaElement): boolean {
  const type = { aac: "audio/aac", mp3: "audio/mpeg", hls: "application/vnd.apple.mpegurl" }[kind];
  return el.canPlayType(type) !== "";
}
