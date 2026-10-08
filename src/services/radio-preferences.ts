import type { RadioStation } from "./radio-browser";

function text(value: unknown, limit = 80): string {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}
function https(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2000) return false;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
}

/** Upgrade legacy stations without trusting missing metadata or stream types. */
export function normalizeRadioStation(value: unknown): RadioStation | null {
  if (!value || typeof value !== "object") return null;
  const station = value as Record<string, unknown>;
  const id = text(station["id"], 512);
  const name = text(station["name"]);
  const candidates = Array.isArray(station["sources"]) ? station["sources"] : [station["streamUrl"]];
  const sources = [...new Set(candidates.filter(https))].slice(0, 8);
  if (!id || !name || !sources.length) return null;
  return {
    id, name, sources,
    favicon: https(station["favicon"]) ? station["favicon"] : "",
    tags: Array.isArray(station["tags"]) ? station["tags"].filter((tag): tag is string => typeof tag === "string").map((tag) => text(tag)).filter(Boolean).slice(0, 4) : [],
    state: text(station["state"]),
    bitrate: typeof station["bitrate"] === "number" && Number.isFinite(station["bitrate"]) && station["bitrate"] >= 0 ? station["bitrate"] : 0,
    codec: text(station["codec"], 20),
    city: text(station["city"]), frequency: text(station["frequency"], 20), homepage: text(station["homepage"], 2000),
    custom: station["custom"] === true, verified: station["verified"] === true,
  };
}

export function normalizeRadioStations(value: unknown, limit: number): RadioStation[] {
  return Array.isArray(value) ? value.slice(0, limit).flatMap((item) => {
    const station = normalizeRadioStation(item);
    return station ? [station] : [];
  }) : [];
}

export function radioGain(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(12, Math.max(-12, value)) : 0;
}
