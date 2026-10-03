import { useCallback, useEffect, useState } from "react";
import type { RadioStation } from "@/services/radio-browser";

const KEY = "sal.radio-custom";

/** User-added stations, persisted locally. */
export function useCustomStations() {
  const [stations, setStations] = useState<RadioStation[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setStations(JSON.parse(raw) as RadioStation[]);
    } catch { /* ignore corrupt storage */ }
  }, []);

  const save = useCallback((next: RadioStation[]) => {
    setStations(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage full */ }
  }, []);

  const add = useCallback((s: RadioStation) => save([s, ...stations.filter((x) => x.id !== s.id)]), [save, stations]);
  const remove = useCallback((id: string) => save(stations.filter((x) => x.id !== id)), [save, stations]);

  return { stations, add, remove };
}
