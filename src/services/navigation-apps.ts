import { useEffect, useState } from "react";
import { isLauncherNative, onLauncherResumed, type NavApp } from "./launcher-system";

export interface NavigationApp { id: NavApp; label: string }
interface AppManager { getNavigationApps(): Promise<{ apps: Array<{ packageName: string; label: string }> }> }
export function navigationPlugin(): AppManager | null {
  if (!isLauncherNative()) return null;
  return (window as unknown as { Capacitor?: { Plugins?: { LauncherSystem?: AppManager } } }).Capacitor?.Plugins?.LauncherSystem ?? null;
}
export const navigationId = (pkg: string): NavApp => pkg === "com.google.android.apps.maps" ? "maps" : pkg === "com.waze" ? "waze" : `package:${pkg}`;
export function useNavigationApps() {
  const [apps, setApps] = useState<NavigationApp[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let gone = false;
    const refresh = async () => {
      try {
        const p = navigationPlugin();
        const next: NavigationApp[] = p
          ? (await p.getNavigationApps()).apps.map(a => ({ id: navigationId(a.packageName), label: a.label }))
          : [{ id: "maps", label: "Google Maps (web)" }, { id: "waze", label: "Waze (web)" }];
        if (!gone) { setApps(next); setReady(true); }
      } catch { if (!gone) setReady(false); }
    };
    void refresh();
    const remove = onLauncherResumed(() => void refresh());
    return () => { gone = true; remove(); };
  }, []);
  return { apps, ready };
}