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

const API_BASE = (import.meta.env["VITE_NAVIGATION_CONNECT_API_BASE"] ?? "").replace(/\/$/, "");
const ACTIVE_TRIP_KEY = "smart-auto-launcher:navigation-connect-trip:v2";

interface ActiveTripRecord {
  tripId: string;
  app: "maps" | "waze";
  expiresAt: string;
  accessKey: string;
}

const tripListeners = new Set<() => void>();
let volatileTrip: ActiveTripRecord | null = null;
export function onNavigationConnectTripChanged(listener: () => void): () => void {
  tripListeners.add(listener);
  return () => { tripListeners.delete(listener); };
}

function validTrip(value: unknown): value is ActiveTripRecord {
  if (!value || typeof value !== "object") return false;
  const trip = value as Partial<ActiveTripRecord>;
  return typeof trip.tripId === "string" && trip.tripId.length > 0 && trip.tripId.length <= 128 &&
    typeof trip.accessKey === "string" && trip.accessKey.length > 0 && trip.accessKey.length <= 512 &&
    (trip.app === "maps" || trip.app === "waze") && typeof trip.expiresAt === "string" &&
    Number.isFinite(Date.parse(trip.expiresAt)) && Date.parse(trip.expiresAt) > Date.now();
}

export function rememberNavigationConnectTrip(trip: Pick<NavigationConnectTrip, "tripId" | "expiresAt"> & { app: "maps" | "waze"; accessKey: string }): void {
  // Explicit allowlist: callers may pass a wider object containing authToken.
  const record = { tripId: trip.tripId, app: trip.app, expiresAt: trip.expiresAt, accessKey: trip.accessKey };
  if (!validTrip(record)) return;
  volatileTrip = record;
  try {
    // Google Navigation Connect authToken is never persisted client-side.
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(ACTIVE_TRIP_KEY, JSON.stringify(record));
  } catch { /* optional cache */ }
  tripListeners.forEach((listener) => listener());
}

export function readNavigationConnectTrip(): ActiveTripRecord | null {
  if (typeof sessionStorage === "undefined") return validTrip(volatileTrip) ? volatileTrip : null;
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(ACTIVE_TRIP_KEY) ?? "null");
    if (!validTrip(value)) {
      sessionStorage.removeItem(ACTIVE_TRIP_KEY);
      return null;
    }
    const record = { tripId: value.tripId, app: value.app, expiresAt: value.expiresAt, accessKey: value.accessKey };
    // Remove credentials accidentally persisted by older clients.
    if ("authToken" in value) sessionStorage.setItem(ACTIVE_TRIP_KEY, JSON.stringify(record));
    volatileTrip = record;
    return record;
  } catch {
    return validTrip(volatileTrip) ? volatileTrip : null;
  }
}

export function clearNavigationConnectTrip(): void {
  volatileTrip = null;
  try { if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(ACTIVE_TRIP_KEY); } catch { /* optional cache */ }
  tripListeners.forEach((listener) => listener());
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
    credentials: "same-origin",
    body: JSON.stringify(input),
  });
  if (response.status === 401 || response.status === 403 || response.status === 404) throw new NavigationConnectUnauthorizedError();
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Falha ao criar viagem oficial (${response.status})`);
  }
  const trip = await response.json() as NavigationConnectTrip;
  const accessKey = response.headers.get("x-navigation-connect-access-key");
  if (!accessKey) throw new Error("Servidor não retornou a capacidade da viagem");
  rememberNavigationConnectTrip({ ...trip, app: input.app, accessKey });
  return trip;
}

export class NavigationConnectUnauthorizedError extends Error {
  constructor() { super("Navigation Connect capability expired or unauthorized"); this.name = "NavigationConnectUnauthorizedError"; }
}

export async function getNavigationConnectTelemetry(tripId: string, accessKey: string): Promise<NavigationConnectTelemetry> {
  const response = await fetch(apiUrl(`/api/navigation/trips/${encodeURIComponent(tripId)}`), {
    headers: { "x-navigation-connect-access-key": accessKey },
    credentials: "same-origin",
    cache: "no-store",
  });
  if (response.status === 401 || response.status === 403 || response.status === 404) {
    throw new NavigationConnectUnauthorizedError();
  }
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Falha ao obter telemetria oficial (${response.status})`);
  }
  return response.json() as Promise<NavigationConnectTelemetry>;
}
