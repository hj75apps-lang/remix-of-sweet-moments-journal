import { useEffect, useState } from "react";
import { onLauncherResumed } from "./launcher-system";

/** Next maneuver published by the navigation app (Google Maps, Waze…) while a route is active. */
export interface NavGuidance {
  packageName: string;
  /** Usually distance + maneuver, e.g. "300 m · Vire à direita". */
  title: string;
  /** Usually the street name. */
  text: string;
  /** Usually ETA / remaining time. */
  subText: string;
  /** Turn arrow image (data URL), empty when not provided. */
  icon: string;
  /** Optional structured telemetry supplied by an integration. */
  distanceMeters?: number;
  remainingDistanceMeters?: number;
  remainingDurationSeconds?: number;
  etaEpochMs?: number;
  maneuver?: string;
}

interface Listener {
  remove: () => Promise<void> | void;
}
interface Plugin {
  getNavigation(): Promise<{ guidance: NavGuidance | null }>;
  hasPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<void>;
  addListener(
    e: "navigationChanged",
    cb: (d: { guidance: NavGuidance | null }) => void,
  ): Promise<Listener> | Listener;
}

function plugin(): Plugin | null {
  if (typeof window === "undefined") return null;
  const cap = (
    window as unknown as {
      Capacitor?: { Plugins?: Record<string, unknown>; isNativePlatform?: () => boolean };
    }
  ).Capacitor;
  if (!cap?.isNativePlatform?.()) return null;
  return (cap.Plugins?.["NowPlaying"] as Plugin | undefined) ?? null;
}


function parseDistance(value: string): number | undefined {
  const match = value.match(/(\\d+(?:[.,]\\d+)?)\\s*(km|m)\\b/i);
  if (!match) return undefined;
  const number = Number(match[1].replace(",", "."));
  if (!Number.isFinite(number)) return undefined;
  return match[2].toLowerCase() === "km" ? number * 1000 : number;
}

function parseDuration(value: string): number | undefined {
  const hours = value.match(/(\\d+)\\s*h/i);
  const minutes = value.match(/(\\d+)\\s*min/i);
  if (!hours && !minutes) return undefined;
  return (Number(hours?.[1] ?? 0) * 3600) + (Number(minutes?.[1] ?? 0) * 60);
}

export function normalizeGuidance(value: NavGuidance | null): NavGuidance | null {
  if (!value) return null;
  const combined = [value.title, value.text, value.subText].filter(Boolean).join(" · ");
  const distance = value.remainingDistanceMeters ?? value.distanceMeters ?? parseDistance(combined);
  const duration = value.remainingDurationSeconds ?? parseDuration(combined);
  return {
    ...value,
    distanceMeters: value.distanceMeters ?? distance,
    remainingDistanceMeters: value.remainingDistanceMeters ?? distance,
    remainingDurationSeconds: value.remainingDurationSeconds ?? duration,
    maneuver: value.maneuver ?? value.title,
  };
}

export const requestGuidanceAccess = async (): Promise<void> => {
  await plugin()?.requestPermission();
};

/** Live guidance + whether notification access is granted (null = not on Android). */
export function useNavGuidance(): { guidance: NavGuidance | null; access: boolean | null } {
  const [guidance, setGuidance] = useState<NavGuidance | null>(null);
  const [access, setAccess] = useState<boolean | null>(null);
  useEffect(() => {
    const p = plugin();
    if (!p) return;
    let handle: Listener | null = null;
    let gone = false;
    const refresh = async () => {
      try {
        const r = await p.hasPermission();
        if (gone) return;
        setAccess(r.granted);
        if (!r.granted) { setGuidance(null); return; }
        const current = await p.getNavigation();
        if (!gone) setGuidance(normalizeGuidance(current.guidance));
      } catch { /* retain last state during a temporary bridge failure */ }
    };
    void refresh();
    const remove = onLauncherResumed(() => void refresh());
    void Promise.resolve(p.addListener("navigationChanged", (d) => { if (!gone) setGuidance(normalizeGuidance(d.guidance)); })).then(
      (h) => (gone ? void h.remove() : (handle = h)),
    ).catch(() => undefined);
    return () => {
      gone = true;
      remove();
      void handle?.remove();
    };
  }, []);
  return { guidance, access };
}
