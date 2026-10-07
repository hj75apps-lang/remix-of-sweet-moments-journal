import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getConnectivity, onConnectivityChanged } from "@/services/connectivity";

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

/** Shared day/night state. The vehicle's night signal temporarily overrides the saved preference. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preferredMode, setPreferredMode] = useState<ThemeMode>("dark");
  const [automaticNight, setAutomaticNight] = useState(false);
  // Vehicle headlights have priority while they are on. When they turn off,
  // the user's saved preference is restored automatically.
  const mode: ThemeMode = automaticNight ? "dark" : preferredMode;

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") {
      setPreferredMode(saved);
    }

    void getConnectivity()
      .then((state) => {
        if (state) setAutomaticNight(state.nightMode);
      })
      .catch(() => {});
    const stopNative = onConnectivityChanged((state) => setAutomaticNight(state.nightMode));

    return () => {
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
    setHasManualPreference(true);
    setPreferredMode((current) => {
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      mode,
      preferredMode,
      automaticNight,
      setMode,
      toggle,
    }),
    [automaticNight, mode, preferredMode, setMode, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}
