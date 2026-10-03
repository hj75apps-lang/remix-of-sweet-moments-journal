import { useCallback, useEffect, useState } from "react";

const KEY = "sal.glass";
const EVENT = "sal-glass-change";
export const DEFAULT_GLASS = 50;

function apply(v: number) {
  document.documentElement.style.setProperty("--glass", String(v / 100));
}

/** Liquid glass intensity 0–100, applied to the whole theme and persisted. */
export function useGlass() {
  const [level, setLevel] = useState(DEFAULT_GLASS);

  useEffect(() => {
    const read = () => {
      const n = Number(localStorage.getItem(KEY));
      const v = Number.isFinite(n) && localStorage.getItem(KEY) !== null ? Math.min(100, Math.max(0, n)) : DEFAULT_GLASS;
      setLevel(v);
      apply(v);
    };
    read();
    window.addEventListener(EVENT, read);
    return () => window.removeEventListener(EVENT, read);
  }, []);

  const set = useCallback((v: number) => {
    localStorage.setItem(KEY, String(v));
    apply(v);
    setLevel(v);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { level, set };
}
