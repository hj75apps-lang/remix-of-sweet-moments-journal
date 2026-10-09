import { useCallback, useEffect, useRef, useState } from "react";
import type { RadioStation } from "@/services/radio-browser";
import { normalizeRadioStations } from "@/services/radio-preferences";

const KEY = "sal.radio-custom";

/** User-added stations, persisted locally. */
export function useCustomStations() {
  const [stations, setStations] = useState<RadioStation[]>([]);
  const current = useRef<RadioStation[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        const restored = normalizeRadioStations(parsed, 100);
        current.current = restored;
        setStations(restored);
      }
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  const save = useCallback((next: RadioStation[]) => {
    current.current = next;
    setStations(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage full */
    }
  }, []);

  const add = useCallback(
    (s: RadioStation) => save([s, ...current.current.filter((x) => x.id !== s.id)].slice(0, 100)),
    [save],
  );
  const remove = useCallback(
    (id: string) => save(current.current.filter((x) => x.id !== id)),
    [save],
  );

  return { stations, add, remove };
}
