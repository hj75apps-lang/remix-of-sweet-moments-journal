import { useCallback, useEffect, useState } from "react";

const KEY = "sal.glass";
const EVENT = "sal-glass-change";
export const DEFAULT_GLASS = 100;

function apply(v: number) {
  document.documentElement.style.setProperty("--glass", String(v / 100));
}

/** Liquid glass intensity 0–100, applied to the whole theme and persisted. */
export function useGlass() {
  const [level, setLevel] = useState(DEFAULT_GLASS);

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(KEY);
        const n = Number(raw);
        const v = Number.isFinite(n) && raw !== null
          ? Math.min(100, Math.max(0, n))
          : DEFAULT_GLASS;
        setLevel(v);
        apply(v);
      } catch {
        setLevel(DEFAULT_GLASS);
        apply(DEFAULT_GLASS);
      }
    };
    read();
    window.addEventListener(EVENT, read);
    return () => window.removeEventListener(EVENT, read);
  }, []);

  const set = useCallback((v: number) => {
    const next = Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : DEFAULT_GLASS;
    try { localStorage.setItem(KEY, String(next)); } catch { /* optional preference */ }
    apply(next);
    setLevel(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { level, set };
}
