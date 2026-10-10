import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { applyLauncherPrefs, setScreenBrightness, type NavApp } from "@/services/launcher-system";
import { readStored, writeStored } from "@/services/storage";
import { useNavigationApps } from "@/services/navigation-apps";
import { isVehicleIcon, type VehicleIcon } from "@/services/vehicle-icon";
import { isMapView, type MapView } from "@/services/navigation-view";
import { isNavigationMapStyle, type NavigationMapStyle } from "@/services/navigation-map-style";

export interface LauncherSettings {
  version: 1;
  navApp: NavApp;
  vehicleIcon: VehicleIcon;
  mapView: MapView;
  mapStyle: NavigationMapStyle;
  /** Legacy preference retained for saved-settings compatibility; home always shows its own map. */
  openNavigatorOnStartup: boolean;
  immersive: boolean;
  keepScreenOn: boolean;
  autostart: boolean;
  clock24h: boolean;
  /** -1 = follow system brightness, otherwise 0.05–1. */
  brightness: number;
  animations: boolean;
  lastDestination: string;
  buttonColor: string;
  buttonOpacity: number;
  navThemeMode: "auto" | "light" | "dark";
}

const KEY = "sal.launcher-settings";
export const DEFAULT_SETTINGS: LauncherSettings = {
  version: 1,
  navApp: "maps",
  vehicleIcon: "arrow",
  mapView: "2d",
  mapStyle: "roads",
  openNavigatorOnStartup: false,
  // System-neutral defaults: Android controls bars, screen timeout and rotation
  // unless the user explicitly enables a launcher-specific override.
  immersive: false,
  keepScreenOn: false,
  autostart: false,
  clock24h: true,
  brightness: -1,
  animations: true,
  lastDestination: "",
  buttonColor: "",
  buttonOpacity: 100,
  navThemeMode: "auto",
};

function normalize(value: unknown): LauncherSettings {
  if (!value || typeof value !== "object") return DEFAULT_SETTINGS;
  try {
    const v = value as Partial<LauncherSettings>;
    if (v.version !== 1) return DEFAULT_SETTINGS;
    const bool = (x: unknown, d: boolean) => (typeof x === "boolean" ? x : d);
    return {
      version: 1,
      vehicleIcon: isVehicleIcon(v.vehicleIcon) ? v.vehicleIcon : "arrow",
      mapView: isMapView(v.mapView) ? v.mapView : "2d",
      mapStyle: isNavigationMapStyle(v.mapStyle) ? v.mapStyle : "roads",
      navApp: v.navApp === "waze" || v.navApp === "system" || (typeof v.navApp === "string" && /^package:[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+$/.test(v.navApp)) ? v.navApp as NavApp : "maps",
      openNavigatorOnStartup: bool(v.openNavigatorOnStartup, false),
      immersive: bool(v.immersive, false),
      keepScreenOn: bool(v.keepScreenOn, false),
      autostart: bool(v.autostart, false),
      clock24h: bool(v.clock24h, true),
      brightness:
        typeof v.brightness === "number" && (v.brightness === -1 || (v.brightness >= 0.05 && v.brightness <= 1))
          ? v.brightness
          : -1,
      animations: bool(v.animations, true),
      lastDestination: typeof v.lastDestination === "string" ? v.lastDestination.slice(0, 200) : "",
      buttonColor: typeof v.buttonColor === "string" && /^#[\da-f]{6}$/i.test(v.buttonColor) ? v.buttonColor : "",
      buttonOpacity: typeof v.buttonOpacity === "number" && v.buttonOpacity >= 10 && v.buttonOpacity <= 100 ? v.buttonOpacity : 100,
      navThemeMode: v.navThemeMode === "light" || v.navThemeMode === "dark" || v.navThemeMode === "auto" ? v.navThemeMode : "auto",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function isLauncherSettings(value: unknown): value is LauncherSettings {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<LauncherSettings>;
  return v.version === 1 &&
    isVehicleIcon(v.vehicleIcon) &&
    isMapView(v.mapView) &&
    isNavigationMapStyle(v.mapStyle) &&
    typeof v.openNavigatorOnStartup === "boolean" &&
    typeof v.immersive === "boolean" &&
    typeof v.keepScreenOn === "boolean" &&
    typeof v.autostart === "boolean" &&
    typeof v.clock24h === "boolean" &&
    typeof v.animations === "boolean" &&
    typeof v.brightness === "number" && (v.brightness === -1 || (v.brightness >= 0.05 && v.brightness <= 1)) &&
    typeof v.lastDestination === "string" && v.lastDestination.length <= 200 &&
    typeof v.buttonColor === "string" && (v.buttonColor === "" || /^#[\da-f]{6}$/i.test(v.buttonColor)) &&
    typeof v.buttonOpacity === "number" && v.buttonOpacity >= 10 && v.buttonOpacity <= 100 &&
    (v.navThemeMode === "auto" || v.navThemeMode === "light" || v.navThemeMode === "dark") &&
    (v.navApp === "maps" || v.navApp === "waze" || v.navApp === "system" ||
      (typeof v.navApp === "string" && /^package:[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+$/.test(v.navApp)));
}

interface Ctx {
  settings: LauncherSettings;
  loaded: boolean;
  update: (patch: Partial<Omit<LauncherSettings, "version">>) => void;
}
const SettingsContext = createContext<Ctx | null>(null);

export function LauncherSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const { apps: navigationApps, ready: navigationAppsReady } = useNavigationApps();

  useEffect(() => {
    setSettings(readStored(KEY, DEFAULT_SETTINGS, {
      schema: 1,
      validate: isLauncherSettings,
      migrateLegacy: normalize,
    }));
    setLoaded(true);
  }, []);

  // Older builds defaulted to immersive + keep-screen-on and could therefore
  // override the head unit's Android window policy on first launch. Reset only
  // those system-facing preferences once; all other launcher preferences stay intact.
  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    const marker = "sal.android-system-integration-v2";
    try {
      if (localStorage.getItem(marker)) return;
      setSettings((prev) => {
        const next = { ...prev, immersive: false, keepScreenOn: false, autostart: false };
        writeStored(KEY, next, 1);
        return next;
      });
      localStorage.setItem(marker, "1");
    } catch {
      // Storage can be unavailable in restricted WebViews; native defaults remain safe.
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    void applyLauncherPrefs({
      immersive: settings.immersive,
      keepScreenOn: settings.keepScreenOn,
      autostart: settings.autostart,
    }).catch(() => undefined);
  }, [loaded, settings.immersive, settings.keepScreenOn, settings.autostart]);

  useEffect(() => {
    if (!loaded) return;
    void setScreenBrightness(settings.brightness).catch(() => undefined);
  }, [loaded, settings.brightness]);

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", !settings.animations);
  }, [settings.animations]);

  useEffect(() => {
    if (!loaded || !navigationAppsReady || settings.navApp === "system") return;
    if (!navigationApps.some((app) => app.id === settings.navApp)) {
      setSettings((prev) => {
        const next = { ...prev, navApp: "system" as NavApp };
        try { writeStored(KEY, next, 1); } catch { /* keep in memory */ }
        return next;
      });
    }
  }, [loaded, navigationApps, navigationAppsReady, settings.navApp]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (settings.buttonColor) {
      document.documentElement.style.setProperty("--launcher-button-color", settings.buttonColor);
    } else {
      document.documentElement.style.removeProperty("--launcher-button-color");
    }
    document.documentElement.style.setProperty("--launcher-button-opacity", String(settings.buttonOpacity / 100));
  }, [settings.buttonColor, settings.buttonOpacity]);

  const update = useCallback<Ctx["update"]>((patch) => {
    setSettings((prev) => {
      const next = normalize({ ...prev, ...patch });
      try {
        writeStored(KEY, next, 1);
      } catch {
        /* storage full: keep in memory */
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ settings, loaded, update }), [settings, loaded, update]);
  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useLauncherSettings(): Ctx {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useLauncherSettings must be used inside LauncherSettingsProvider");
  return ctx;
}
