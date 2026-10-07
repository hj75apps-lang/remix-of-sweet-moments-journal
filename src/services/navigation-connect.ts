import type { NavApp } from "./launcher-system";

export interface NavigationConnectTrip {
  tripId: string;
  authToken: string;
  expiresAt: string;
  launchUrl: string;
}

export interface NavigationConnectTelemetry {
  tripId: string;
  state: string;
  active: boolean;
  sourcePackage: string | null;
  latitude?: number;
  longitude?: number;
  etaEpochMs?: number;
  remainingDistanceMeters?: number;
  remainingDurationSeconds?: number;
  route?: {
    points: Array<{ latitude: number; longitude: number }>;
    remainingDistanceMeters?: number;
    remainingDurationSeconds?: number;
    etaEpochMs?: number;
  };
  updatedAt?: string;
}

const API_BASE = (import.meta.env.VITE_NAVIGATION_CONNECT_API_BASE ?? "").replace(/\/$/, "");
const ACTIVE_TRIP_KEY = "smart-auto-launcher:navigation-connect-trip:v1";

interface ActiveTripRecord {
  tripId: string;
  app: "maps" | "waze";
  expiresAt: string;
}

export function rememberNavigationConnectTrip(trip: Pick<NavigationConnectTrip, "tripId" | "expiresAt"> & { app: "maps" | "waze" }): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(ACTIVE_TRIP_KEY, JSON.stringify(trip));
  } catch { /* optional cache */ }
}

export function readNavigationConnectTrip(): ActiveTripRecord | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const value = JSON.parse(localStorage.getItem(ACTIVE_TRIP_KEY) ?? "null") as Partial<ActiveTripRecord> | null;
    if (!value?.tripId || (value.app !== "maps" && value.app !== "waze")) return null;
    if (value.expiresAt && Date.parse(value.expiresAt) <= Date.now()) {
      localStorage.removeItem(ACTIVE_TRIP_KEY);
      return null;
    }
    return { tripId: value.tripId, app: value.app, expiresAt: value.expiresAt ?? "" };
  } catch {
    return null;
  }
}

export function clearNavigationConnectTrip(): void {
  if (typeof localStorage !== "undefined") localStorage.removeItem(ACTIVE_TRIP_KEY);
}

function apiUrl(path: string): string {
  return API_BASE ? `${API_BASE}${path}` : path;
}

export function isNavigationConnectConfigured(): boolean {
  return Boolean(API_BASE || typeof window !== "undefined");
}

export async function createNavigationConnectTrip(input: {
  app: Extract<NavApp, "maps" | "waze">;
  destination: string;
  latitude?: number;
  longitude?: number;
}): Promise<NavigationConnectTrip> {
  const response = await fetch(apiUrl("/api/navigation/trips"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Falha ao criar viagem oficial (${response.status})`);
  }
  const trip = await response.json() as NavigationConnectTrip;
  rememberNavigationConnectTrip({ ...trip, app: input.app });
  return trip;
}

export async function getNavigationConnectTelemetry(tripId: string): Promise<NavigationConnectTelemetry> {
  const response = await fetch(apiUrl(`/api/navigation/trips/${encodeURIComponent(tripId)}`), {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Falha ao obter telemetria oficial (${response.status})`);
  }
  return response.json() as Promise<NavigationConnectTelemetry>;
}
