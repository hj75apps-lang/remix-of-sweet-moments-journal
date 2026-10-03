import { useEffect, useState } from "react";

export type ThemeMode = "dark" | "light";
const STORAGE_KEY = "sal.theme";

/** Day/night theme, applied to <html> and persisted. */
export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") setMode(saved);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light", mode === "light");
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  return { mode, toggle: () => setMode((m) => (m === "dark" ? "light" : "dark")) };
}
