import type { NowPlaying } from "./now-playing";
import type { RadioStation } from "./radio-browser";

export type MediaStatus = "playing" | "paused" | "loading" | "error" | "unavailable";
export const metadataText = (value: unknown): string => typeof value === "string" ? Array.from(value).map((character) => character.charCodeAt(0) < 32 ? " " : character).join("").trim().slice(0, 300) : "";
export function metadataImage(value: unknown): string {
  if (typeof value !== "string") return "";
  if (/^data:image\/(png|jpeg|webp);base64,[a-z\d+/=]+$/i.test(value) && value.length < 500000) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
  } catch { return ""; }
}

/** Frequencies are never inferred from bare numbers in station names. */
export function confirmedFrequency(station: Pick<RadioStation, "frequency" | "name" | "verified">): string {
  const explicit = `${station.frequency ?? ""}`.match(/^\s*(\d{2,4}(?:[.,]\d{1,2})?)\s*(FM|AM)\s*$/i);
  if (explicit) return `${explicit[1]?.replace(",", ".")} ${explicit[2]?.toUpperCase()}`;
  const before = station.name.match(/\b(FM|AM)\s*(\d{2,4}(?:[.,]\d{1,2})?)\b/i);
  const named = station.name.match(/\b(\d{2,4}(?:[.,]\d{1,2})?)\s*(FM|AM)\b/i)
    ?? (before ? [before[0], before[2], before[1]] : null);
  if (named) return `${named[1]?.replace(",", ".")} ${named[2]?.toUpperCase()}`;
  return "";
}

export interface StreamMetadata { title: string; artist: string }
/** ICY's StreamTitle is authoritative text, not necessarily an artist/song pair. */
export function parseIcyMetadata(block: string): StreamMetadata | null {
  const match = block.replace(/\0/g, "").match(/(?:^|;)\s*StreamTitle='([\s\S]*?)';/i);
  const title = metadataText(match?.[1]);
  return title ? { title, artist: "" } : null;
}

export function radioMetadata(station: RadioStation, status: string, playing: boolean, track: StreamMetadata | null): NowPlaying {
  return {
    title: track?.title ?? "", artist: track?.artist ?? "", album: "",
    stationName: station.name, frequency: confirmedFrequency(station),
    sourceName: "Rádios Online", packageName: "", artwork: metadataImage(station.favicon),
    playing, status: playing ? "playing" : status === "loading" || status === "reconnecting" ? "loading" : status === "error" ? "error" : "paused",
    duration: 0, position: 0, kind: "radio",
  };
}

/** Untrusted bridge fields are narrowed before becoming render-visible state. */
export function normalizeNativeMedia(value: unknown): NowPlaying | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const packageName = metadataText(v['packageName']);
  if (!/^[a-zA-Z\d_]+(?:\.[a-zA-Z\d_]+)+$/.test(packageName)) return null;
  const duration = typeof v['duration'] === "number" && Number.isFinite(v['duration']) ? Math.max(0, v['duration']) : 0;
  const position = typeof v['position'] === "number" && Number.isFinite(v['position']) ? Math.max(0, v['position']) : 0;
  const playing = v['playing'] === true;
  const status: MediaStatus = playing ? "playing" : v['status'] === "loading" || v['status'] === "error" || v['status'] === "unavailable" ? v['status'] : "paused";
  return {
    title: metadataText(v['title']), artist: metadataText(v['artist']), album: metadataText(v['album']),
    sourceName: metadataText(v['sourceName']) || packageName, packageName,
    artwork: metadataImage(v['artwork']), sourceIcon: metadataImage(v['sourceIcon']),
    playing, status, duration, position: duration ? Math.min(duration, position) : position, kind: "app",
  };
}

export const mediaStatusLabel = (media: NowPlaying): string => {
  const status = media.status ?? (media.playing ? "playing" : "paused");
  return { playing: "Tocando", paused: "Pausado", loading: "Carregando…", error: "Falha na reprodução", unavailable: "Sem informações de reprodução" }[status];
};