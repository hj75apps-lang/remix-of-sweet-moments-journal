import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavGuidance } from "@/services/navigation-guidance";
import { subscribeLocation } from "@/services/location-store";
import type { VehiclePosition } from "@/services/navigation-location";
import { onLauncherResumed } from "@/services/launcher-system";
import { ExternalNavigationProvider } from "@/services/navigation-provider";
import type { NavigationState } from "@/services/navigation-state";

export interface NavigationContextState extends NavigationState {
  access: boolean | null;
  provider: ExternalNavigationProvider;
  acquireLocation(): () => void;
}

const NavigationContext = createContext<NavigationContextState | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const { guidance, access } = useNavGuidance();
  const [position, setPosition] = useState<VehiclePosition | null>(null);
  const [locating, setLocating] = useState(true);
  const [online, setOnline] = useState(true);
  const [visible, setVisible] = useState(true);
  const [users, setUsers] = useState(0);
  const lastFix = useRef(0);

  const acquireLocation = useCallback(() => {
    setUsers((n) => n + 1);
    let released = false;
    return () => {
      if (!released) {
        released = true;
        setUsers((n) => Math.max(0, n - 1));
      }
    };
  }, []);

  useEffect(() => {
    const sync = () => {
      setVisible(!document.hidden);
      setOnline(navigator.onLine);
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    const remove = onLauncherResumed(sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      remove();
    };
  }, []);

  const active = Boolean(guidance);
  const locationActive = users > 0 && visible;

  useEffect(() => {
    if (!locationActive) return;
    return subscribeLocation((fix) => {
      if (!Number.isFinite(fix.latitude) || !Number.isFinite(fix.longitude)) return;
      if (fix.timestamp - lastFix.current < 1000) return;
      lastFix.current = fix.timestamp;
      setPosition(fix);
      setLocating(false);
    });
  }, [locationActive]);

  useEffect(() => {
    if (position) return;
    setLocating(true);
  }, [position]);

  const state = useMemo<NavigationState>(
    () => ({
      position,
      locating,
      online,
      active,
      sourcePackage: guidance?.packageName ?? null,
      guidance,
      route: null,
    }),
    [position, locating, online, active, guidance],
  );

  const provider = useMemo(() => new ExternalNavigationProvider({
    active: state.active,
    sourcePackage: state.sourcePackage,
    guidance: state.guidance,
    route: state.route,
    position: state.position,
  }), [state]);

  return (
    <NavigationContext.Provider value={{ ...state, access, provider, acquireLocation }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigationState() {
  const state = useContext(NavigationContext);
  if (!state) throw new Error("NavigationProvider missing");
  return state;
}
