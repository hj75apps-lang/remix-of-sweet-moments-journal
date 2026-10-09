import type { VehiclePosition } from "./navigation-location";

export interface HeadingState { heading: number; anchor: VehiclePosition | null }
export const INITIAL_HEADING: HeadingState = { heading: 0, anchor: null };
export function normalizeHeading(degrees: number): number { return ((degrees % 360) + 360) % 360; }
export function headingDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}
/** Prefer GPS course; derive travel direction only after movement exceeds GPS noise. */
export function followHeading(previous: HeadingState, fix: VehiclePosition): HeadingState {
  const anchor = previous.anchor;
  if (anchor && fix.timestamp <= anchor.timestamp) return previous;
  if (fix.speed !== null && Number.isFinite(fix.speed) && fix.speed < 0.8) {
    return { heading: previous.heading, anchor: fix };
  }
  if (fix.heading !== null && Number.isFinite(fix.heading)) {
    return { heading: normalizeHeading(fix.heading), anchor: fix };
  }
  if (!anchor) return { heading: previous.heading, anchor: fix };
  const radians = Math.PI / 180;
  const lat1 = anchor.latitude * radians;
  const lat2 = fix.latitude * radians;
  const deltaLat = lat2 - lat1;
  const deltaLon = (fix.longitude - anchor.longitude) * radians;
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  const distance = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  const accuracy = Math.max(anchor.accuracy, fix.accuracy);
  if (distance < Math.max(6, Number.isFinite(accuracy) ? accuracy : 6)) return previous;
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  return { heading: normalizeHeading(Math.atan2(y, x) / radians), anchor: fix };
}