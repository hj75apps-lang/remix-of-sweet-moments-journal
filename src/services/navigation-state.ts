import type { VehiclePosition } from "./navigation-location";
import type { NavGuidance } from "./navigation-guidance";

export interface RoutePoint { latitude: number; longitude: number; }

export interface NavigationRoute {
  points: RoutePoint[];
  totalDistanceMeters?: number;
  remainingDistanceMeters?: number;
  etaEpochMs?: number;
  remainingDurationSeconds?: number;
  progress?: number;
}

export interface NavigationState {
  position: VehiclePosition | null;
  locating: boolean;
  online: boolean;
  active: boolean;
  sourcePackage: string | null;
  guidance: NavGuidance | null;
  route: NavigationRoute | null;
}

export function formatDistance(meters?: number): string {
  if (!Number.isFinite(meters)) return "";
  const value = Number(meters);
  if (value < 1000) return `${Math.max(0, Math.round(value / 10) * 10)} m`;
  return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1).replace(".", ",")} km`;
}

export function formatDuration(seconds?: number): string {
  if (!Number.isFinite(seconds)) return "";
  const minutes = Math.max(0, Math.round(Number(seconds) / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export function formatEta(epochMs?: number, now = Date.now()): string {
  if (!Number.isFinite(epochMs)) return "";
  const date = new Date(Number(epochMs));
  if (Number.isNaN(date.getTime()) || date.getTime() < now - 24 * 60 * 60 * 1000) return "";
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function clampProgress(value?: number): number | undefined {
  if (!Number.isFinite(value)) return undefined;
  return Math.min(1, Math.max(0, Number(value)));
}