import { buildNavigationUrl } from "./navigation-deep-link-manager";
import { createNavigationConnectTrip } from "./navigation-connect";
/**
 * Bridge to the native "LauncherSystem" plugin. Outside the Android app every
 * call reports "unavailable" instead of pretending to succeed.
 */
export interface DeviceInfo {
  sdk: number;
  manufacturer: string;
  model: string;
  isDefaultHome: boolean;
  hasTelephony: boolean;
  hasBluetooth: boolean;
  hasGps: boolean;
  hasCamera: boolean;
  hasMicrophone: boolean;
  googleMaps: boolean;
  waze: boolean;
  volume: number;
  maxVolume: number;
  muted: boolean;
}
export type NavApp = "maps" | "waze" | "system" | `package:${string}`;
export interface Contact {
  name: string;
  number: string;
}
export interface CallEntry {
  number: string;
  name: string;
  type: "incoming" | "outgoing" | "missed" | "other";
  date: number;
}
interface Listener {
  remove: () => Promise<void> | void;
}
interface LauncherSystemPlugin {
  getInfo(): Promise<DeviceInfo>;
  applyPrefs(p: { immersive: boolean; keepScreenOn: boolean; autostart: boolean }): Promise<void>;
  setBrightness(p: { value: number }): Promise<void>;
  openHomeSettings(): Promise<void>;
  requestDefaultHome(): Promise<{ supported?: boolean; requested?: boolean; isDefaultHome: boolean }>;
  openAppSettings(): Promise<void>;
  navigate(p: { app: NavApp; destination?: string; launchUrl?: string }): Promise<void>;
  resumeNavigation(p: { packageName: string }): Promise<void>;
  setVolume(p: { value: number }): Promise<{ volume: number; maxVolume: number }>;
  toggleMute(): Promise<{ muted: boolean }>;
  mediaKey(p: { key: "forward" | "rewind" | "next" | "previous" | "toggle" }): Promise<void>;
  getContacts(): Promise<{ contacts: Contact[] }>;
  getCallLog(): Promise<{ calls: CallEntry[] }>;
  addListener(event: "resumed", cb: () => void): Promise<Listener> | Listener;
}

export class LauncherUnavailableError extends Error {
  constructor() {
    super("unavailable");
  }
}

function plugin(): LauncherSystemPlugin | null {
  if (typeof window === "undefined") return null;
  const cap = (
    window as unknown as {
      Capacitor?: { Plugins?: Record<string, unknown>; isNativePlatform?: () => boolean };
    }
  ).Capacitor;
  if (!cap?.isNativePlatform?.()) return null;
  return (cap.Plugins?.["LauncherSystem"] as LauncherSystemPlugin | undefined) ?? null;
}

function req(): LauncherSystemPlugin {
  const p = plugin();
  if (!p) throw new LauncherUnavailableError();
  return p;
}

export const isLauncherNative = (): boolean => plugin() !== null;
export const getDeviceInfo = async (): Promise<DeviceInfo | null> => plugin()?.getInfo() ?? null;
export const applyLauncherPrefs = async (p: {
  immersive: boolean;
  keepScreenOn: boolean;
  autostart: boolean;
}): Promise<void> => {
  await plugin()?.applyPrefs(p);
};
export const setScreenBrightness = async (value: number): Promise<void> => {
  await plugin()?.setBrightness({ value });
};
export const openHomeSettings = (): Promise<void> => req().openHomeSettings();
export const requestDefaultHome = () => req().requestDefaultHome();
export const openAppSettings = (): Promise<void> => req().openAppSettings();
export const setSystemVolume = (value: number) => req().setVolume({ value });
export const toggleSystemMute = () => req().toggleMute();
export const sendMediaKey = (key: "forward" | "rewind" | "next" | "previous" | "toggle") =>
  req().mediaKey({ key });
export const getContacts = async (): Promise<Contact[]> => (await req().getContacts()).contacts;
export const getCallLog = async (): Promise<CallEntry[]> => (await req().getCallLog()).calls;

/** Opens navigation. In a browser, falls back to the official Google Maps / Waze web links. */
export async function startNavigation(app: NavApp, destination: string): Promise<void> {
  const p = plugin();
  const isTrackedApp = (app === "maps" || app === "waze") && destination.trim().length > 0;
  if (isTrackedApp) {
    try {
      const trip = await createNavigationConnectTrip({ app, destination });
      if (p) {
        await p.navigate({ app, destination, launchUrl: trip.launchUrl });
      } else {
        window.open(trip.launchUrl, "_blank", "noopener,noreferrer");
      }
      return;
    } catch {
      // Official telemetry is optional until the server/Google Cloud project is configured.
      // Preserve the existing navigation behavior rather than blocking navigation.
    }
  }
  if (p) return p.navigate({ app, destination });
  const url = buildNavigationUrl({ app, destination });
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Resume the navigation app's current activity without starting a replacement route. */
export async function resumeNavigation(packageName: string, fallback: NavApp): Promise<void> {
  const p = plugin();
  if (p) return p.resumeNavigation({ packageName });
  return startNavigation(fallback, "");
}

export function onLauncherResumed(cb: () => void): () => void {
  const p = plugin();
  if (!p) return () => undefined;
  let handle: Listener | null = null;
  let removed = false;
  void Promise.resolve(p.addListener("resumed", cb)).then((h) => {
    if (removed) void h.remove();
    else handle = h;
  });
  return () => {
    removed = true;
    void handle?.remove();
  };
}

export function errorMessage(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (m === "unavailable") return "Disponível apenas no app instalado na central.";
  if (m === "not_installed") return "Aplicativo não instalado nesta central.";
  if (m === "permission_denied") return "Permissão negada. Libere nas configurações do Android.";
  if (m === "blocked") return "O sistema bloqueou esta ação (modo Não perturbe).";
  return "Não foi possível concluir a ação.";
}
