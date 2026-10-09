import type { NavApp } from "./launcher-system";
import { readBoundedText } from "./bounded-body";

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
let volatileOnly = false;
let creatorCredential: string | null = null;
let tripRequestVersion = 0;
let pendingCreate: AbortController | null = null;

/** Supply a provisioned credential from the authenticated host; never persist it or compile it into VITE_*. */
export function setNavigationConnectCreatorCredential(value: string | null): void {
  if (value !== null && !/^[A-Za-z0-9_-]{32,256}$/.test(value)) throw new Error("Credencial de navegação inválida");
  if (value !== null && value === creatorCredential) return;
  creatorCredential = value;
  clearNavigationConnectTrip();
}
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
  volatileOnly = true;
  try {
    // Google Navigation Connect authToken is never persisted client-side.
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(ACTIVE_TRIP_KEY, JSON.stringify(record));
      volatileOnly = false;
    }
  } catch { /* optional cache */ }
  tripListeners.forEach((listener) => listener());
}

export function readNavigationConnectTrip(): ActiveTripRecord | null {
  if (volatileOnly || typeof sessionStorage === "undefined") return validTrip(volatileTrip) ? volatileTrip : null;
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
  tripRequestVersion += 1;
  pendingCreate?.abort();
  pendingCreate = null;
  volatileTrip = null;
  volatileOnly = false;
  try { if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(ACTIVE_TRIP_KEY); } catch { /* optional cache */ }
  tripListeners.forEach((listener) => listener());
}

function apiUrl(path: string): string {
  if (!API_BASE) {
    if (typeof window !== "undefined" && window.location.protocol !== "https:" &&
      window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") throw new Error("Servidor de navegação deve usar HTTPS");
    return path;
  }
  const base = new URL(API_BASE);
  const local = base.protocol === "http:" && (base.hostname === "localhost" || base.hostname === "127.0.0.1");
  if ((base.protocol !== "https:" && !local) || base.username || base.password || base.search || base.hash) throw new Error("Servidor de navegação deve usar HTTPS");
  return `${API_BASE}${path}`;
}

async function navigationJson(response: Response, limit: number): Promise<unknown> {
  if (response.status === 401 || response.status === 403 || response.status === 404) {
    void response.body?.cancel().catch(() => undefined);
    throw new NavigationConnectUnauthorizedError();
  }
  if (!response.ok) {
    void response.body?.cancel().catch(() => undefined);
    throw new Error(`Serviço de navegação indisponível (${response.status})`);
  }
  return JSON.parse(await readBoundedText(response, limit));
}

async function navigationRequest(path: string, init: RequestInit, limit: number, controller = new AbortController()): Promise<{ response: Response; payload: unknown }> {
  // AbortController works on WebViews that predate AbortSignal.timeout/any.
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(apiUrl(path), { ...init, signal: controller.signal, redirect: "error" });
    return { response, payload: await navigationJson(response, limit) };
  } finally { clearTimeout(timer); }
}

export class NavigationConnectSupersededError extends Error {
  constructor() { super("Solicitação de navegação substituída ou encerrada"); this.name = "NavigationConnectSupersededError"; }
}

function isLaunchUrl(value: unknown, app: "maps" | "waze"): value is string {
  if (typeof value !== "string" || value.length > 8192) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      (app === "waze" ? url.hostname === "waze.com" && url.pathname === "/ul" : url.hostname === "www.google.com" && url.pathname === "/maps/dir/");
  } catch { return false; }
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
  pendingCreate?.abort();
  const controller = new AbortController();
  pendingCreate = controller;
  const version = ++tripRequestVersion;
  try {
    const { response, payload } = await navigationRequest("/api/navigation/trips", {
      method: "POST",
      headers: { "content-type": "application/json", ...(creatorCredential ? { authorization: `Bearer ${creatorCredential}` } : {}) },
      credentials: "same-origin",
      body: JSON.stringify(input),
    }, 32_768, controller);
    if (version !== tripRequestVersion) throw new NavigationConnectSupersededError();
    const trip = payload as Partial<NavigationConnectTrip> | null;
    const accessKey = response.headers.get("x-navigation-connect-access-key");
    const record = { tripId: trip?.tripId, expiresAt: trip?.expiresAt, app: input.app, accessKey };
    if (!trip || typeof trip !== "object" || typeof trip.tripId !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(trip.tripId) ||
      typeof trip.authToken !== "string" || !trip.authToken || trip.authToken.length > 4096 ||
      !isLaunchUrl(trip.launchUrl, input.app) || !validTrip(record)) {
      throw new Error("Servidor retornou uma viagem inválida");
    }
    rememberNavigationConnectTrip(record);
    return trip as NavigationConnectTrip;
  } catch (error) {
    if (version !== tripRequestVersion) throw new NavigationConnectSupersededError();
    throw error;
  } finally { if (pendingCreate === controller) pendingCreate = null; }
}

export class NavigationConnectUnauthorizedError extends Error {
  constructor() { super("Navigation Connect capability expired or unauthorized"); this.name = "NavigationConnectUnauthorizedError"; }
}

export async function getNavigationConnectTelemetry(tripId: string, accessKey: string): Promise<NavigationConnectTelemetry> {
  const { payload } = await navigationRequest(`/api/navigation/trips/${encodeURIComponent(tripId)}`, {
    headers: { "x-navigation-connect-access-key": accessKey },
    credentials: "same-origin",
    cache: "no-store",
  }, 2_000_000);
  if (!validTelemetry(payload, tripId)) throw new Error("Servidor retornou telemetria inválida");
  return payload;
}

function validTelemetry(value: unknown, tripId: string): value is NavigationConnectTelemetry {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<NavigationConnectTelemetry>;
  const number = (input: unknown) => input === undefined || (typeof input === "number" && Number.isFinite(input) && input >= 0);
  if (data.tripId !== tripId || typeof data.state !== "string" || data.state.length > 80 || typeof data.active !== "boolean" ||
    (data.sourcePackage !== null && typeof data.sourcePackage !== "string") ||
    !number(data.etaEpochMs) || !number(data.remainingDistanceMeters) || !number(data.remainingDurationSeconds)) return false;
  const position = (latitude: unknown, longitude: unknown) => typeof latitude === "number" && Number.isFinite(latitude) && Math.abs(latitude) <= 90 &&
    typeof longitude === "number" && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
  if ((data.latitude !== undefined || data.longitude !== undefined) && !position(data.latitude, data.longitude)) return false;
  if (data.route !== undefined && (!data.route || typeof data.route !== "object" || !Array.isArray(data.route.points) || data.route.points.length > 10_000 ||
    !data.route.points.every((point) => point && position(point.latitude, point.longitude)) ||
    !number(data.route.etaEpochMs) || !number(data.route.remainingDistanceMeters) || !number(data.route.remainingDurationSeconds))) return false;
  return data.updatedAt === undefined || (typeof data.updatedAt === "string" && Number.isFinite(Date.parse(data.updatedAt)));
}
