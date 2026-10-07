import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavGuidance } from "@/services/navigation-guidance";
import { subscribeLocation } from "@/services/location-store";
import type { VehiclePosition } from "@/services/navigation-location";
import { onLauncherResumed } from "@/services/launcher-system";

interface NavigationState {
  position: VehiclePosition | null;
  locating: boolean;
  online: boolean;
  guidance: ReturnType<typeof useNavGuidance>["guidance"];
  access: boolean | null;
  acquireLocation(): () => void;
}
const NavigationContext = createContext<NavigationState | null>(null);
export function NavigationProvider({ children }: { children: ReactNode }) {
  const { guidance, access } = useNavGuidance();
  const [position, setPosition] = useState<VehiclePosition | null>(null);
  const [locating, setLocating] = useState(true);
  const [online, setOnline] = useState(true);
  const [visible, setVisible] = useState(true);
  const [users, setUsers] = useState(0);
  const lastFix = useRef(0);
  const acquireLocation = useCallback(() => {
    setUsers(n => n + 1);
    let released = false;
    return () => { if (!released) { released = true; setUsers(n => Math.max(0, n - 1)); } };
  }, []);
  useEffect(() => {
    const sync = () => { setVisible(!document.hidden); setOnline(navigator.onLine); };
    sync();
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    const remove = onLauncherResumed(sync);
    return () => { document.removeEventListener("visibilitychange", sync); window.removeEventListener("online", sync); window.removeEventListener("offline", sync); remove(); };
  }, []);
  const active = users > 0 && visible;
  useEffect(() => {
    if (!active) return;
    return subscribeLocation(fix => {
      if (!Number.isFinite(fix.latitude) || !Number.isFinite(fix.longitude)) return;
      if (fix.timestamp - lastFix.current < 1000) return;
      lastFix.current = fix.timestamp;
      setPosition(fix);
      setLocating(false);
    });
  }, [active]);
  return <NavigationContext.Provider value={{ position, locating, online, guidance, access, acquireLocation }}>{children}</NavigationContext.Provider>;
}
export function useNavigationState() {
  const state = useContext(NavigationContext);
  if (!state) throw new Error("NavigationProvider missing");
  return state;
}
