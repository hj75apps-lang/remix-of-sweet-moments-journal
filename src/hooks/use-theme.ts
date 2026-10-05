import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getConnectivity, isSystemControlsAvailable, onConnectivityChanged } from "@/services/connectivity";

export type ThemeMode = "dark" | "light";
const STORAGE_KEY = "sal.theme";

interface ThemeContextValue {
  mode: ThemeMode;
  preferredMode: ThemeMode;
  automaticNight: boolean;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function storedMode(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "light" || saved === "dark" ? saved : "dark";
}

/** Shared day/night state. The vehicle's night signal temporarily overrides the saved preference. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preferredMode, setPreferredMode] = useState<ThemeMode>(storedMode);
  const [automaticNight, setAutomaticNight] = useState(false);
  const mode: ThemeMode = automaticNight ? "dark" : preferredMode;

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateBrowserSignal = () => {
      if (!isSystemControlsAvailable()) setAutomaticNight(media.matches);
    };
    updateBrowserSignal();
    media.addEventListener?.("change", updateBrowserSignal);

    void getConnectivity()
      .then((state) => {
        if (state) setAutomaticNight(state.nightMode);
      })
      .catch(() => {});
    const stopNative = onConnectivityChanged((state) => setAutomaticNight(state.nightMode));

    return () => {
      media.removeEventListener?.("change", updateBrowserSignal);
      stopNative();
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light", mode === "light");
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setPreferredMode(nextMode);
    localStorage.setItem(STORAGE_KEY, nextMode);
  }, []);
  const toggle = useCallback(() => {
    setPreferredMode((current) => {
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ mode, preferredMode, automaticNight, setMode, toggle }),
    [automaticNight, mode, preferredMode, setMode, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}
