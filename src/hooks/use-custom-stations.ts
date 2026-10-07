import { useCallback, useEffect, useState } from "react";
import type { RadioStation } from "@/services/radio-browser";

const KEY = "sal.radio-custom";

function isStation(value: unknown): value is RadioStation {
  if (!value || typeof value !== "object") return false;
  const station = value as Partial<RadioStation>;
  return typeof station.id === "string" &&
    typeof station.name === "string" &&
    Array.isArray(station.sources) &&
    station.sources.every((source) => typeof source === "string" && source.startsWith("https://"));
}

/** User-added stations, persisted locally. */
export function useCustomStations() {
  const [stations, setStations] = useState<RadioStation[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) setStations(parsed.filter(isStation).slice(0, 100));
      }
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  const save = useCallback((next: RadioStation[]) => {
    setStations(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage full */
    }
  }, []);

  const add = useCallback(
    (s: RadioStation) => save([s, ...stations.filter((x) => x.id !== s.id)]),
    [save, stations],
  );
  const remove = useCallback(
    (id: string) => save(stations.filter((x) => x.id !== id)),
    [save, stations],
  );

  return { stations, add, remove };
}
