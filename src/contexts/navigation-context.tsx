import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavGuidance } from "@/services/navigation-guidance";
import { subscribeLocation } from "@/services/location-store";
import type { VehiclePosition } from "@/services/navigation-location";
import { onLauncherResumed } from "@/services/launcher-system";
import { ExternalNavigationProvider } from "@/services/navigation-provider";
import {
  clearNavigationConnectTrip,
  getNavigationConnectTelemetry,
  readNavigationConnectTrip,
  type NavigationConnectTelemetry,
} from "@/services/navigation-connect";
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
  const [connectTelemetry, setConnectTelemetry] = useState<NavigationConnectTelemetry | null>(null);
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

  const active = Boolean(connectTelemetry?.active || guidance);
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

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const poll = async () => {
      if (!visible || !online) return;
      const trip = readNavigationConnectTrip();
      if (!trip) {
        if (!cancelled) setConnectTelemetry(null);
        return;
      }
      try {
        const telemetry = await getNavigationConnectTelemetry(trip.tripId, trip.accessKey);
        if (cancelled) return;
        setConnectTelemetry(telemetry);
        if (!telemetry.active) {
          clearNavigationConnectTrip();
          timer = setTimeout(() => void poll(), 1000);
          return;
        }
      } catch (error) {
        if (error instanceof Error && error.name === "NavigationConnectUnauthorizedError") {
          clearNavigationConnectTrip();
          setConnectTelemetry(null);
          return;
        }
        // Keep the last authoritative telemetry during transient connectivity loss.
      }
      if (!cancelled) timer = setTimeout(() => void poll(), 5000);
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [visible, online]);

  useEffect(() => {
    const latitude = connectTelemetry?.latitude;
    const longitude = connectTelemetry?.longitude;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    setPosition({
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracy: 0,
      heading: null,
      speed: null,
      timestamp: Date.now(),
    });
    setLocating(false);
  }, [connectTelemetry?.latitude, connectTelemetry?.longitude]);

  const state = useMemo<NavigationState>(
    () => ({
      position,
      locating,
      online,
      active,
      sourcePackage:
        connectTelemetry?.sourcePackage ??
        (connectTelemetry?.active ? (readNavigationConnectTrip()?.app === "waze" ? "com.waze" : "com.google.android.apps.maps") : null) ??
        guidance?.packageName ??
        null,
      guidance: guidance
        ? {
            ...guidance,
            remainingDistanceMeters: connectTelemetry?.remainingDistanceMeters ?? guidance.remainingDistanceMeters,
            remainingDurationSeconds: connectTelemetry?.remainingDurationSeconds ?? guidance.remainingDurationSeconds,
            etaEpochMs: connectTelemetry?.etaEpochMs ?? guidance.etaEpochMs,
          }
        : null,
      route: connectTelemetry?.route
        ? {
            points: connectTelemetry.route.points,
            remainingDistanceMeters: connectTelemetry.route.remainingDistanceMeters,
            remainingDurationSeconds: connectTelemetry.route.remainingDurationSeconds,
            etaEpochMs: connectTelemetry.route.etaEpochMs,
          }
        : null,
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
