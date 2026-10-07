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
  return response.json() as Promise<NavigationConnectTrip>;
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
