import { useEffect, useState } from "react";

/** Returns the current Date (null until mounted, to avoid SSR mismatch). */
export function useClock(intervalMs = 1000): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const period = Math.max(1000, intervalMs);
    const refresh = () => {
      clearTimeout(timer);
      if (document.hidden) return;
      setNow(new Date());
      // Align to the displayed unit rather than drifting from mount time.
      timer = setTimeout(refresh, period - Date.now() % period);
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [intervalMs]);
  return now;
}

/** Real browser connectivity (null until mounted). */
export function useOnline(): boolean | null {
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}
