import { useEffect, useState } from "react";

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
    void p
      .hasPermission()
      .then((r) => !gone && setAccess(r.granted))
      .catch(() => undefined);
    void p
      .getNavigation()
      .then((r) => !gone && setGuidance(r.guidance))
      .catch(() => undefined);
    void Promise.resolve(p.addListener("navigationChanged", (d) => setGuidance(d.guidance))).then(
      (h) => (gone ? void h.remove() : (handle = h)),
    );
    return () => {
      gone = true;
      void handle?.remove();
    };
  }, []);
  return { guidance, access };
}
