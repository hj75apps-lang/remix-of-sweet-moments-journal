import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { applyLauncherPrefs, setScreenBrightness, type NavApp } from "@/services/launcher-system";
import { readStored, writeStored } from "@/services/storage";

export interface LauncherSettings {
  version: 1;
  navApp: NavApp;
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
}

const KEY = "sal.launcher-settings";
export const DEFAULT_SETTINGS: LauncherSettings = {
  version: 1,
  navApp: "maps",
  immersive: true,
  keepScreenOn: true,
  autostart: true,
  clock24h: true,
  brightness: -1,
  animations: true,
  lastDestination: "",
  buttonColor: "",
  buttonOpacity: 100,
};

function normalize(value: unknown): LauncherSettings {
  if (!value || typeof value !== "object") return DEFAULT_SETTINGS;
  try {
    const v = value as Partial<LauncherSettings>;
    if (v.version !== 1) return DEFAULT_SETTINGS;
    const bool = (x: unknown, d: boolean) => (typeof x === "boolean" ? x : d);
    return {
      version: 1,
      navApp: v.navApp === "waze" || v.navApp === "system" || (typeof v.navApp === "string" && /^package:[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+$/.test(v.navApp)) ? v.navApp as NavApp : "maps",
      immersive: bool(v.immersive, true),
      keepScreenOn: bool(v.keepScreenOn, true),
      autostart: bool(v.autostart, true),
      clock24h: bool(v.clock24h, true),
      brightness:
        typeof v.brightness === "number" && v.brightness >= -1 && v.brightness <= 1
          ? v.brightness
          : -1,
      animations: bool(v.animations, true),
      lastDestination: typeof v.lastDestination === "string" ? v.lastDestination.slice(0, 200) : "",
      buttonColor: typeof v.buttonColor === "string" ? v.buttonColor : "",
      buttonOpacity: typeof v.buttonOpacity === "number" && v.buttonOpacity >= 10 && v.buttonOpacity <= 100 ? v.buttonOpacity : 100,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function isLauncherSettings(value: unknown): value is LauncherSettings {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<LauncherSettings>;
  return v.version === 1 &&
    typeof v.immersive === "boolean" &&
    typeof v.keepScreenOn === "boolean" &&
    typeof v.autostart === "boolean" &&
    typeof v.clock24h === "boolean" &&
    typeof v.animations === "boolean" &&
    typeof v.brightness === "number" && v.brightness >= -1 && v.brightness <= 1 &&
    typeof v.lastDestination === "string" &&
    typeof v.buttonColor === "string" &&
    typeof v.buttonOpacity === "number" &&
    (v.navApp === "maps" || v.navApp === "waze" || v.navApp === "system" ||
      (typeof v.navApp === "string" && /^package:[a-zA-Z0-9_]+(?:\\.[a-zA-Z0-9_]+)+$/.test(v.navApp)));
}

interface Ctx {
  settings: LauncherSettings;
  update: (patch: Partial<Omit<LauncherSettings, "version">>) => void;
}
const SettingsContext = createContext<Ctx | null>(null);

export function LauncherSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(readStored(KEY, DEFAULT_SETTINGS, {
      schema: 1,
      validate: isLauncherSettings,
      migrateLegacy: normalize,
    }));
  }, []);

  useEffect(() => {
    void applyLauncherPrefs({
      immersive: settings.immersive,
      keepScreenOn: settings.keepScreenOn,
      autostart: settings.autostart,
    }).catch(() => undefined);
  }, [settings.immersive, settings.keepScreenOn, settings.autostart]);

  useEffect(() => {
    void setScreenBrightness(settings.brightness).catch(() => undefined);
  }, [settings.brightness]);

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", !settings.animations);
  }, [settings.animations]);

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
      const next = { ...prev, ...patch };
      try {
        writeStored(KEY, next, 1);
      } catch {
        /* storage full: keep in memory */
      }
      return next;
    });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, update }}>{children}</SettingsContext.Provider>
  );
}

export function useLauncherSettings(): Ctx {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useLauncherSettings must be used inside LauncherSettingsProvider");
  return ctx;
}
