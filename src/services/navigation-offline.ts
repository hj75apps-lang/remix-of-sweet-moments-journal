import type { VehiclePosition } from "./navigation-location";
import { readStored, writeStored } from "./storage";

const POSITION_KEY = "sal.navigation-last-position";
const TILE_CACHE = "sal-viewed-map-tiles-v1";
const MAX_TILES = 160;

export function isSavedMapPosition(value: unknown): value is VehiclePosition {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<VehiclePosition>;
  return typeof p.latitude === "number" && Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90
    && typeof p.longitude === "number" && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180
    && typeof p.accuracy === "number" && Number.isFinite(p.accuracy) && p.accuracy >= 0
    && typeof p.timestamp === "number" && Number.isFinite(p.timestamp) && p.timestamp > 0
    && (p.heading === null || (typeof p.heading === "number" && Number.isFinite(p.heading)))
    && (p.speed === null || (typeof p.speed === "number" && Number.isFinite(p.speed)));
}

export function readMapPosition(): VehiclePosition | null {
  return readStored<VehiclePosition | null>(POSITION_KEY, null, { schema: 1, validate: isSavedMapPosition });
}

export function saveMapPosition(position: VehiclePosition): void {
  if (isSavedMapPosition(position)) writeStored(POSITION_KEY, position, 1);
}

/** Only tiles actually displayed are cached; no region downloads or prefetching. */
export async function viewedMapTile(url: string): Promise<Blob> {
  let cache: Cache | null = null;
  try {
    if (typeof caches !== "undefined") cache = await caches.open(TILE_CACHE);
  } catch { /* Optional cache; online map still works. */ }
  let saved: Response | undefined;
  try { saved = await cache?.match(url); } catch { /* Storage unavailable. */ }
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  const age = saved ? Date.now() - Date.parse(saved.headers.get("date") ?? "") : Infinity;
  const providerMaxAge = Number(saved?.headers.get("cache-control")?.match(/max-age=(\d+)/)?.[1] ?? 604800) * 1000;
  if (saved && (offline || age < providerMaxAge)) return saved.blob();
  if (offline) throw new Error("map_tile_not_saved");
  try {
    const response = await fetch(url, { cache: "default", credentials: "omit" });
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) throw new Error("map_tile_unavailable");
    if (cache && !/no-store/i.test(response.headers.get("cache-control") ?? "")) {
      try {
        await cache.put(url, response.clone());
        const keys = await cache.keys();
        await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_TILES)).map((key) => cache?.delete(key)));
      } catch { /* Quota errors must not hide the current map. */ }
    }
    return response.blob();
  } catch (error) {
    if (saved) return saved.blob();
    throw error;
  }
}